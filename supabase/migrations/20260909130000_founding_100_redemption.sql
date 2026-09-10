-- =============================================================
-- Founding 100 redemption
--
-- Stripe confirms payment; the database owns the final transition
-- from a temporary checkout claim to a permanent redeemed membership.
--
-- Also records the optional Certified Consultant add-on.
-- =============================================================

ALTER TABLE portal.campaign_offers
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS redeemed_stripe_event_id text,
  ADD COLUMN IF NOT EXISTS certification_purchased_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS
  idx_campaign_offers_stripe_subscription
ON portal.campaign_offers (stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;


-- -------------------------------------------------------------
-- Redeem a paid campaign membership
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal.fn_redeem_campaign_offer(
  p_org_id uuid,
  p_campaign_key text,
  p_stripe_subscription_id text,
  p_stripe_event_id text,
  p_certification_purchased boolean DEFAULT false
)
RETURNS portal.campaign_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = portal
AS $$
DECLARE
  v_campaign        portal.campaigns;
  v_offer           portal.campaign_offers;
  v_redeemed_count  integer;
  v_now             timestamptz := now();
BEGIN
  IF p_stripe_subscription_id IS NULL
     OR btrim(p_stripe_subscription_id) = '' THEN
    RAISE EXCEPTION 'stripe_subscription_id_required';
  END IF;

  IF p_stripe_event_id IS NULL
     OR btrim(p_stripe_event_id) = '' THEN
    RAISE EXCEPTION 'stripe_event_id_required';
  END IF;

  -- Serialize the permanent capacity decision for this campaign.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_campaign_key, 0)
  );

  SELECT *
    INTO v_campaign
    FROM portal.campaigns
   WHERE campaign_key = p_campaign_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_not_found';
  END IF;

  SELECT *
    INTO v_offer
    FROM portal.campaign_offers
   WHERE campaign_key = p_campaign_key
     AND org_id = p_org_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_offer_not_found';
  END IF;

  -- Stripe webhooks are retried. Returning the existing redemption makes
  -- this function safely idempotent for the same subscription.
  IF v_offer.status = 'redeemed' THEN
    IF v_offer.stripe_subscription_id IS NOT NULL
       AND v_offer.stripe_subscription_id <> p_stripe_subscription_id THEN
      RAISE EXCEPTION 'campaign_offer_subscription_mismatch';
    END IF;

    IF p_certification_purchased
       AND v_offer.certification_purchased_at IS NULL THEN
      UPDATE portal.campaign_offers
         SET certification_purchased_at = v_now
       WHERE id = v_offer.id
       RETURNING *
        INTO v_offer;
    END IF;

    RETURN v_offer;
  END IF;

  IF v_offer.status NOT IN ('eligible', 'claimed') THEN
    RAISE EXCEPTION 'campaign_offer_not_redeemable';
  END IF;

  -- Permanent capacity is based on paid/redeemed memberships.
  SELECT count(*)
    INTO v_redeemed_count
    FROM portal.campaign_offers
   WHERE campaign_key = p_campaign_key
     AND status = 'redeemed'
     AND id <> v_offer.id;

  IF v_redeemed_count >= v_campaign.max_redemptions THEN
    RAISE EXCEPTION 'campaign_sold_out';
  END IF;

  UPDATE portal.campaign_offers
     SET status = 'redeemed',
         redeemed_at = COALESCE(redeemed_at, v_now),
         claim_expires_at = NULL,
         stripe_subscription_id = p_stripe_subscription_id,
         redeemed_stripe_event_id = p_stripe_event_id,
         certification_purchased_at =
           CASE
             WHEN p_certification_purchased
               THEN COALESCE(certification_purchased_at, v_now)
             ELSE certification_purchased_at
           END
   WHERE id = v_offer.id
   RETURNING *
    INTO v_offer;

  RETURN v_offer;
END;
$$;

REVOKE ALL
  ON FUNCTION portal.fn_redeem_campaign_offer(
    uuid,
    text,
    text,
    text,
    boolean
  )
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION portal.fn_redeem_campaign_offer(
    uuid,
    text,
    text,
    text,
    boolean
  )
  TO service_role;


-- -------------------------------------------------------------
-- Release an abandoned/expired Stripe Checkout reservation
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal.fn_release_campaign_claim(
  p_org_id uuid,
  p_campaign_key text,
  p_checkout_session_id text
)
RETURNS portal.campaign_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = portal
AS $$
DECLARE
  v_offer portal.campaign_offers;
  v_now   timestamptz := now();
BEGIN
  SELECT *
    INTO v_offer
    FROM portal.campaign_offers
   WHERE campaign_key = p_campaign_key
     AND org_id = p_org_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_offer_not_found';
  END IF;

  -- Never release a paid membership.
  IF v_offer.status = 'redeemed' THEN
    RETURN v_offer;
  END IF;

  -- Only the Stripe session that owns this claim may release it.
  IF v_offer.stripe_checkout_session_id IS DISTINCT FROM
     p_checkout_session_id THEN
    RETURN v_offer;
  END IF;

  UPDATE portal.campaign_offers
     SET status =
           CASE
             WHEN expires_at <= v_now THEN 'expired'
             ELSE 'eligible'
           END,
         claimed_at = NULL,
         claim_expires_at = NULL,
         stripe_checkout_session_id = NULL
   WHERE id = v_offer.id
   RETURNING *
    INTO v_offer;

  RETURN v_offer;
END;
$$;

REVOKE ALL
  ON FUNCTION portal.fn_release_campaign_claim(uuid, text, text)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION portal.fn_release_campaign_claim(uuid, text, text)
  TO service_role;

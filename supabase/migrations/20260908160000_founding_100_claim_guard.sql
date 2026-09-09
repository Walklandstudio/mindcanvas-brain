-- =============================================================
-- Founding 100 checkout claim guard
--
-- Permanent membership is still based on successful redemption/payment.
-- A short-lived checkout claim prevents more than 100 people from being
-- able to complete payment simultaneously.
--
-- Stale checkout claims automatically stop consuming capacity.
-- =============================================================

CREATE OR REPLACE FUNCTION portal.fn_claim_campaign_offer(
  p_org_id uuid,
  p_campaign_key text
)
RETURNS portal.campaign_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = portal
AS $$
DECLARE
  v_campaign       portal.campaigns;
  v_offer          portal.campaign_offers;
  v_reserved_count integer;
  v_now            timestamptz := now();
BEGIN
  -- Serialize capacity decisions for this campaign.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_campaign_key, 0)
  );

  SELECT *
    INTO v_campaign
    FROM portal.campaigns
   WHERE campaign_key = p_campaign_key
     AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_not_active';
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

  IF v_offer.status = 'redeemed' THEN
    RAISE EXCEPTION 'campaign_offer_already_redeemed';
  END IF;

  -- The seven-day invitation window is authoritative.
  --
  -- Do not attempt to persist "expired" here before raising: PostgreSQL
  -- would roll that update back with the exception. Read paths derive the
  -- effective expired state directly from expires_at.
  IF v_offer.expires_at <= v_now THEN
    RAISE EXCEPTION 'campaign_offer_expired';
  END IF;

  -- If this organisation already owns a live checkout reservation,
  -- keep it rather than consuming another slot.
  IF v_offer.status = 'claimed'
     AND v_offer.claim_expires_at IS NOT NULL
     AND v_offer.claim_expires_at > v_now THEN
    RETURN v_offer;
  END IF;

  -- Release stale checkout reservations. These were never paid and
  -- therefore must not permanently consume one of the 100 memberships.
  UPDATE portal.campaign_offers
     SET status = 'eligible',
         claimed_at = NULL,
         claim_expires_at = NULL,
         stripe_checkout_session_id = NULL
   WHERE campaign_key = p_campaign_key
     AND status = 'claimed'
     AND (
       claim_expires_at IS NULL
       OR claim_expires_at <= v_now
     )
     AND expires_at > v_now;

  -- Redeemed memberships plus currently-live checkout reservations
  -- must never exceed the campaign capacity.
  SELECT count(*)
    INTO v_reserved_count
    FROM portal.campaign_offers
   WHERE campaign_key = p_campaign_key
     AND (
       status = 'redeemed'
       OR (
         status = 'claimed'
         AND claim_expires_at IS NOT NULL
         AND claim_expires_at > v_now
       )
     );

  IF v_reserved_count >= v_campaign.max_redemptions THEN
    RAISE EXCEPTION 'campaign_sold_out';
  END IF;

  UPDATE portal.campaign_offers
     SET status = 'claimed',
         claimed_at = v_now,
         claim_expires_at = LEAST(
           v_now + interval '35 minutes',
           v_offer.expires_at
         )
   WHERE id = v_offer.id
   RETURNING *
    INTO v_offer;

  RETURN v_offer;
END;
$$;

REVOKE ALL
  ON FUNCTION portal.fn_claim_campaign_offer(uuid, text)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION portal.fn_claim_campaign_offer(uuid, text)
  TO service_role;

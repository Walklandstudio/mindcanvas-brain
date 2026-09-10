-- =============================================================
-- Founding 100 campaign foundation
--
-- Commercial rules:
--   - campaign: Founding 100
--   - target subscription: Tier 2
--   - engines: Sales + Coaching
--   - recurring allowance after conversion: 20 submissions/month
--   - conversion window: 7 days from campaign activation
--   - maximum redeemed memberships: 100
--
-- Stripe remains the source of truth for price and discount.
--
-- This is intentionally separate from portal.first_link_offers so the
-- previously-tested first-link promotion remains intact and rollback-safe.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Campaign configuration
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS portal.campaigns (
  campaign_key               text PRIMARY KEY,
  name                       text NOT NULL,

  status                     text NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'inactive')),

  target_tier                int NOT NULL
                             CHECK (target_tier BETWEEN 1 AND 4),

  max_redemptions            int NOT NULL
                             CHECK (max_redemptions > 0),

  access_window_days         int NOT NULL
                             CHECK (access_window_days > 0),

  monthly_allowance_override int
                             CHECK (
                               monthly_allowance_override IS NULL
                               OR monthly_allowance_override > 0
                             ),

  engine_keys                text[] NOT NULL DEFAULT ARRAY[]::text[]
                             CHECK (
                               engine_keys <@
                               ARRAY['sales', 'coaching', 'people']::text[]
                             ),

  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON portal.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION portal.fn_set_updated_at();

ALTER TABLE portal.campaigns ENABLE ROW LEVEL SECURITY;

-- Campaign configuration is server-controlled. No authenticated write policy.


-- -------------------------------------------------------------
-- 2. Individual campaign enrollment / offer
--
-- user_id exists before an organisation is created during onboarding.
-- org_id is attached later once onboarding creates the organisation.
--
-- starts_at/expires_at are persisted so re-opening the campaign link
-- never restarts the seven-day clock.
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS portal.campaign_offers (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  campaign_key               text NOT NULL
                             REFERENCES portal.campaigns(campaign_key)
                             ON DELETE RESTRICT,

  user_id                    uuid NOT NULL,

  org_id                     uuid
                             REFERENCES portal.orgs(id)
                             ON DELETE CASCADE,

  status                     text NOT NULL DEFAULT 'eligible'
                             CHECK (
                               status IN (
                                 'eligible',
                                 'claimed',
                                 'redeemed',
                                 'expired'
                               )
                             ),

  starts_at                  timestamptz NOT NULL DEFAULT now(),
  expires_at                 timestamptz NOT NULL,

  claimed_at                 timestamptz,
  claim_expires_at           timestamptz,

  redeemed_at                timestamptz,

  stripe_checkout_session_id text,

  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),

  UNIQUE (campaign_key, user_id),

  CONSTRAINT chk_campaign_offer_expiry
    CHECK (expires_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_offers_campaign_org
  ON portal.campaign_offers (campaign_key, org_id)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_offers_status
  ON portal.campaign_offers (campaign_key, status);

CREATE INDEX IF NOT EXISTS idx_campaign_offers_expiry
  ON portal.campaign_offers (campaign_key, expires_at);

CREATE TRIGGER trg_campaign_offers_updated_at
  BEFORE UPDATE ON portal.campaign_offers
  FOR EACH ROW
  EXECUTE FUNCTION portal.fn_set_updated_at();

ALTER TABLE portal.campaign_offers ENABLE ROW LEVEL SECURITY;

-- All enrollment, claiming and redemption writes are server-controlled.


-- -------------------------------------------------------------
-- 3. Seed the Founding 100 campaign
-- -------------------------------------------------------------

INSERT INTO portal.campaigns (
  campaign_key,
  name,
  status,
  target_tier,
  max_redemptions,
  access_window_days,
  monthly_allowance_override,
  engine_keys
)
VALUES (
  'founding_100',
  'Founding 100',
  'active',
  2,
  100,
  7,
  20,
  ARRAY['sales', 'coaching']::text[]
)
ON CONFLICT (campaign_key) DO UPDATE
SET
  name                       = EXCLUDED.name,
  target_tier                = EXCLUDED.target_tier,
  max_redemptions            = EXCLUDED.max_redemptions,
  access_window_days         = EXCLUDED.access_window_days,
  monthly_allowance_override = EXCLUDED.monthly_allowance_override,
  engine_keys                = EXCLUDED.engine_keys;


-- -------------------------------------------------------------
-- 4. Idempotent campaign enrollment
--
-- Calling this again for the same person does NOT reset starts_at or
-- expires_at. This is what prevents somebody from restarting the
-- seven-day countdown by reopening Dan's campaign link.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal.fn_enroll_campaign_offer(
  p_user_id uuid,
  p_campaign_key text
)
RETURNS portal.campaign_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = portal
AS $$
DECLARE
  v_campaign portal.campaigns;
  v_offer    portal.campaign_offers;
BEGIN
  SELECT *
    INTO v_campaign
    FROM portal.campaigns
   WHERE campaign_key = p_campaign_key
     AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_not_active';
  END IF;

  INSERT INTO portal.campaign_offers (
    campaign_key,
    user_id,
    status,
    starts_at,
    expires_at
  )
  VALUES (
    p_campaign_key,
    p_user_id,
    'eligible',
    now(),
    now() + make_interval(days => v_campaign.access_window_days)
  )
  ON CONFLICT (campaign_key, user_id)
  DO NOTHING
  RETURNING *
    INTO v_offer;

  -- Already enrolled: return the original row unchanged.
  -- In particular, starts_at and expires_at are never reset.
  IF v_offer.id IS NULL THEN
    SELECT *
      INTO v_offer
      FROM portal.campaign_offers
     WHERE campaign_key = p_campaign_key
       AND user_id = p_user_id;
  END IF;

  RETURN v_offer;
END;
$$;

REVOKE ALL
  ON FUNCTION portal.fn_enroll_campaign_offer(uuid, text)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION portal.fn_enroll_campaign_offer(uuid, text)
  TO service_role;


-- -------------------------------------------------------------
-- 5. Attach the user's organisation once onboarding creates it
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal.fn_attach_campaign_offer_org(
  p_user_id uuid,
  p_org_id uuid,
  p_campaign_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = portal
AS $$
BEGIN
  UPDATE portal.campaign_offers
     SET org_id = p_org_id
   WHERE user_id = p_user_id
     AND campaign_key = p_campaign_key
     AND (org_id IS NULL OR org_id = p_org_id);
END;
$$;

REVOKE ALL
  ON FUNCTION portal.fn_attach_campaign_offer_org(uuid, uuid, text)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION portal.fn_attach_campaign_offer_org(uuid, uuid, text)
  TO service_role;

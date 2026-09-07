-- =============================================================
-- First Test Link activation offer
--
-- Eligible Free Trial organisations are offered 70% off their
-- first paid subscription for 3 months after creating their
-- first-ever test link.
--
-- Stripe remains the source of truth for the actual discount.
-- This table records MindCanvas eligibility and redemption state.
-- =============================================================

CREATE TABLE IF NOT EXISTS portal.first_link_offers (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                     uuid NOT NULL REFERENCES portal.orgs(id) ON DELETE CASCADE,
  offer_key                  text NOT NULL DEFAULT 'first_link_70_3m',
  status                     text NOT NULL DEFAULT 'offered'
                             CHECK (status IN ('offered', 'claimed', 'redeemed')),
  triggered_at               timestamptz NOT NULL DEFAULT now(),
  claimed_at                 timestamptz,
  redeemed_at                timestamptz,
  stripe_checkout_session_id text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),

  UNIQUE (org_id, offer_key)
);

CREATE INDEX IF NOT EXISTS idx_first_link_offers_status
  ON portal.first_link_offers (status);

CREATE INDEX IF NOT EXISTS idx_first_link_offers_org
  ON portal.first_link_offers (org_id);

CREATE TRIGGER trg_first_link_offers_updated_at
  BEFORE UPDATE ON portal.first_link_offers
  FOR EACH ROW
  EXECUTE FUNCTION portal.fn_set_updated_at();

ALTER TABLE portal.first_link_offers ENABLE ROW LEVEL SECURITY;

-- Deliberately no authenticated write policy.
-- Eligibility, claiming and redemption are controlled by server-side
-- service-role routes only.

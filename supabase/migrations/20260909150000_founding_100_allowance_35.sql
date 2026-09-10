-- =============================================================
-- Founding 100 monthly allowance
--
-- Updated commercial agreement:
--   - normal Tier 2 remains 10 submissions/month
--   - redeemed Founding 100 members receive 35 submissions/month
-- =============================================================

DO $$
BEGIN
  UPDATE portal.campaigns
     SET monthly_allowance_override = 35
   WHERE campaign_key = 'founding_100';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'founding_100_campaign_not_found';
  END IF;
END;
$$;

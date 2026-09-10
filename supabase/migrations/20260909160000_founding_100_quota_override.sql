-- =============================================================
-- Founding 100 monthly quota override
--
-- Redeemed Founding 100 members on Tier 2 receive the campaign's
-- monthly allowance override (currently 35 submissions/month).
--
-- Normal Tier 2 and every other organisation retain their existing
-- subscription allowance. Historical/manual extra trials and purchased
-- usage bundles remain additive and unchanged.
-- =============================================================

CREATE OR REPLACE FUNCTION portal.fn_effective_monthly_submission_allowance(
  p_org_id uuid,
  p_tier integer,
  p_base_allowance integer
) RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = portal
AS $$
  SELECT COALESCE(
    (
      SELECT c.monthly_allowance_override
        FROM portal.campaign_offers co
        JOIN portal.campaigns c
          ON c.campaign_key = co.campaign_key
       WHERE co.org_id = p_org_id
         AND co.campaign_key = 'founding_100'
         AND co.status = 'redeemed'
         AND c.target_tier = p_tier
         AND c.monthly_allowance_override IS NOT NULL
       LIMIT 1
    ),
    GREATEST(COALESCE(p_base_allowance, 0), 0)
  );
$$;

REVOKE ALL
  ON FUNCTION portal.fn_effective_monthly_submission_allowance(
    uuid,
    integer,
    integer
  )
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION portal.fn_effective_monthly_submission_allowance(
    uuid,
    integer,
    integer
  )
  TO service_role;


-- -------------------------------------------------------------
-- 2. Reserve one submission atomically
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION portal.fn_reserve_submission(
  p_org_id       uuid,
  p_reference_id text,
  p_test_id      uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = portal
AS $$
DECLARE
  v_ent                  portal.entitlements%ROWTYPE;
  v_bundle               portal.usage_bundle_allocations%ROWTYPE;
  v_allowance            integer := 0;
  v_used                 integer := 0;
  v_engine               text;
  v_engine_remaining     integer;
  v_billing_account_id   uuid;
  v_existing_event_type  text;
  v_existing_engine      text;
  v_existing_purchase_id uuid;
  v_purchased_remaining  integer := 0;
  v_org_can_use_bundles  boolean := false;
BEGIN
  IF p_reference_id IS NULL OR btrim(p_reference_id) = '' THEN
    RAISE EXCEPTION 'invalid_reference_id';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM portal.submission_quota_exemptions
     WHERE org_id = p_org_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'exempt', true);
  END IF;

  -- Serialize retries for the same org + submission reference, then check
  -- whether a prior attempt has already consumed a credit.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_org_id::text),
    hashtext(p_reference_id)
  );

  SELECT ul.event_type, ul.engine_key, ul.purchase_id
    INTO v_existing_event_type, v_existing_engine, v_existing_purchase_id
    FROM portal.usage_ledger ul
   WHERE ul.org_id = p_org_id
     AND ul.reference_type = 'submission'
     AND ul.reference_id = p_reference_id
     AND ul.event_type IN (
       'engine_trial_consumed',
       'trial_consumed',
       'usage_bundle_consumed'
     )
   ORDER BY ul.created_at ASC
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'source', CASE v_existing_event_type
                  WHEN 'engine_trial_consumed' THEN 'engine_trial'
                  WHEN 'trial_consumed' THEN 'subscription'
                  ELSE 'usage_bundle'
                END,
      'engine_key', v_existing_engine,
      'purchase_id', v_existing_purchase_id
    );
  END IF;

  -- ---- per-engine onboarding trial --------------------------------
  IF p_test_id IS NOT NULL THEN
    SELECT et.engine_key
      INTO v_engine
      FROM portal.engine_tests et
     WHERE et.test_id = p_test_id
       AND et.active
     LIMIT 1;

    -- Wrapper tests point to their catalogue test through meta.
    IF v_engine IS NULL THEN
      SELECT et.engine_key
        INTO v_engine
        FROM portal.tests t
        JOIN portal.engine_tests et
          ON et.active
         AND et.test_id = (
               CASE
                 WHEN COALESCE(
                        t.meta->>'source_test_id',
                        t.meta->>'base_test_id',
                        t.meta->>'parent_test_id'
                      ) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                 THEN COALESCE(
                        t.meta->>'source_test_id',
                        t.meta->>'base_test_id',
                        t.meta->>'parent_test_id'
                      )::uuid
               END
             )
       WHERE t.id = p_test_id
       LIMIT 1;
    END IF;
  END IF;

  IF v_engine IS NOT NULL THEN
    UPDATE portal.engine_trial_allocations
       SET quantity_remaining = quantity_remaining - 1
     WHERE org_id = p_org_id
       AND engine_key = v_engine
       AND allocation_type = 'trial'
       AND quantity_remaining > 0
    RETURNING quantity_remaining
         INTO v_engine_remaining;

    IF FOUND THEN
      SELECT ba.id
        INTO v_billing_account_id
        FROM portal.billing_accounts ba
       WHERE ba.org_id = p_org_id
         AND ba.billing_type = 'owner'
       LIMIT 1;

      INSERT INTO portal.usage_ledger (
        org_id,
        billing_account_id,
        event_type,
        quantity,
        reference_type,
        reference_id,
        engine_key
      ) VALUES (
        p_org_id,
        v_billing_account_id,
        'engine_trial_consumed',
        1,
        'submission',
        p_reference_id,
        v_engine
      );

      RETURN jsonb_build_object(
        'ok', true,
        'source', 'engine_trial',
        'engine_key', v_engine,
        'remaining', v_engine_remaining
      );
    END IF;
  END IF;

  -- ---- recurring subscription allowance ---------------------------
  SELECT e.*
    INTO v_ent
    FROM portal.entitlements e
    JOIN portal.billing_accounts ba
      ON ba.id = e.billing_account_id
   WHERE e.org_id = p_org_id
     AND e.status = 'active'
     AND ba.billing_type = 'owner'
   ORDER BY e.period_start DESC
   LIMIT 1
   FOR UPDATE OF e;

  IF v_ent.id IS NOT NULL THEN
    -- extra_trials_purchased is retained only for any historical/manual
    -- balance already stored on the current entitlement. New bundle purchases
    -- are never written here.
    v_allowance :=
      portal.fn_effective_monthly_submission_allowance(
        p_org_id,
        v_ent.tier,
        v_ent.included_trials_per_month
      )
      + v_ent.extra_trials_purchased;

    SELECT COALESCE(sum(ul.quantity), 0)::integer
      INTO v_used
      FROM portal.usage_ledger ul
     WHERE ul.billing_account_id = v_ent.billing_account_id
       AND ul.event_type = 'trial_consumed'
       AND ul.created_at >= v_ent.period_start
       AND ul.created_at < v_ent.period_end;

    IF v_used < v_allowance THEN
      INSERT INTO portal.usage_ledger (
        org_id,
        billing_account_id,
        event_type,
        quantity,
        reference_type,
        reference_id
      ) VALUES (
        p_org_id,
        v_ent.billing_account_id,
        'trial_consumed',
        1,
        'submission',
        p_reference_id
      );

      RETURN jsonb_build_object(
        'ok', true,
        'source', 'subscription',
        'allowance', v_allowance,
        'used', v_used + 1,
        'remaining', v_allowance - v_used - 1
      );
    END IF;
  END IF;

  -- ---- persistent purchased bundle --------------------------------
  SELECT (o.status = 'active')
    INTO v_org_can_use_bundles
    FROM portal.orgs o
   WHERE o.id = p_org_id;

  IF COALESCE(v_org_can_use_bundles, false) THEN
    SELECT a.*
      INTO v_bundle
      FROM portal.usage_bundle_allocations a
     WHERE a.org_id = p_org_id
       AND a.status = 'active'
       AND a.quantity_remaining > 0
       AND (a.expires_at IS NULL OR a.expires_at > now())
     ORDER BY a.expires_at ASC NULLS LAST, a.created_at ASC, a.id ASC
     LIMIT 1
     FOR UPDATE OF a;

    IF v_bundle.id IS NOT NULL THEN
      UPDATE portal.usage_bundle_allocations
         SET quantity_remaining = quantity_remaining - 1,
             status = CASE
                        WHEN quantity_remaining - 1 = 0 THEN 'exhausted'
                        ELSE 'active'
                      END
       WHERE id = v_bundle.id;

      v_billing_account_id := v_ent.billing_account_id;

      IF v_billing_account_id IS NULL THEN
        SELECT ba.id
          INTO v_billing_account_id
          FROM portal.billing_accounts ba
         WHERE ba.org_id = p_org_id
           AND ba.billing_type = 'owner'
         LIMIT 1;
      END IF;

      INSERT INTO portal.usage_ledger (
        org_id,
        billing_account_id,
        event_type,
        quantity,
        reference_type,
        reference_id,
        purchase_id
      ) VALUES (
        p_org_id,
        v_billing_account_id,
        'usage_bundle_consumed',
        1,
        'submission',
        p_reference_id,
        v_bundle.purchase_id
      );

      v_purchased_remaining :=
        portal.fn_purchased_usage_remaining(p_org_id);

      RETURN jsonb_build_object(
        'ok', true,
        'source', 'usage_bundle',
        'purchase_id', v_bundle.purchase_id,
        'purchased_remaining', v_purchased_remaining,
        'remaining', v_purchased_remaining
      );
    END IF;
  END IF;

  v_purchased_remaining :=
    portal.fn_purchased_usage_remaining(p_org_id);

  IF v_ent.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'no_subscription',
      'purchased_remaining', v_purchased_remaining
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', false,
    'reason', 'limit_reached',
    'allowance', v_allowance,
    'used', v_used,
    'remaining', 0,
    'purchased_remaining', v_purchased_remaining
  );
END;
$$;

GRANT EXECUTE ON FUNCTION portal.fn_reserve_submission(uuid, text, uuid) TO service_role;

-- -------------------------------------------------------------
-- 3. Organisation-wide usage summary
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION portal.fn_submission_usage(
  p_org_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = portal
AS $$
DECLARE
  v_ent                  portal.entitlements%ROWTYPE;
  v_allowance            integer := 0;
  v_used                 integer := 0;
  v_included_remaining   integer := 0;
  v_trial_remaining      integer := 0;
  v_purchased_remaining  integer := 0;
BEGIN
  IF EXISTS (
    SELECT 1
      FROM portal.submission_quota_exemptions
     WHERE org_id = p_org_id
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'exempt', true,
      'allowance', NULL,
      'used', 0,
      'remaining', NULL,
      'included_limit', NULL,
      'included_used', 0,
      'included_remaining', NULL,
      'purchased_remaining', NULL,
      'total_remaining', NULL,
      'trial_remaining', NULL,
      'period_start', NULL,
      'period_end', NULL
    );
  END IF;

  SELECT COALESCE(sum(a.quantity_remaining), 0)::integer
    INTO v_trial_remaining
    FROM portal.engine_trial_allocations a
   WHERE a.org_id = p_org_id
     AND a.allocation_type = 'trial';

  v_purchased_remaining :=
    portal.fn_purchased_usage_remaining(p_org_id);

  SELECT e.*
    INTO v_ent
    FROM portal.entitlements e
    JOIN portal.billing_accounts ba
      ON ba.id = e.billing_account_id
   WHERE e.org_id = p_org_id
     AND e.status = 'active'
     AND ba.billing_type = 'owner'
   ORDER BY e.period_start DESC
   LIMIT 1;

  IF v_ent.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', (v_trial_remaining > 0 OR v_purchased_remaining > 0),
      'reason', CASE
                  WHEN v_trial_remaining > 0 OR v_purchased_remaining > 0
                    THEN NULL
                  ELSE 'no_subscription'
                END,
      'allowance', 0,
      'used', 0,
      'remaining', 0,
      'included_limit', 0,
      'included_used', 0,
      'included_remaining', 0,
      'purchased_remaining', v_purchased_remaining,
      'total_remaining', v_purchased_remaining,
      'trial_remaining', v_trial_remaining,
      'period_start', NULL,
      'period_end', NULL
    );
  END IF;

  v_allowance :=
    portal.fn_effective_monthly_submission_allowance(
      p_org_id,
      v_ent.tier,
      v_ent.included_trials_per_month
    )
    + v_ent.extra_trials_purchased;

  SELECT COALESCE(sum(ul.quantity), 0)::integer
    INTO v_used
    FROM portal.usage_ledger ul
   WHERE ul.billing_account_id = v_ent.billing_account_id
     AND ul.event_type = 'trial_consumed'
     AND ul.created_at >= v_ent.period_start
     AND ul.created_at < v_ent.period_end;

  v_included_remaining := greatest(v_allowance - v_used, 0);

  RETURN jsonb_build_object(
    'ok', true,
    'allowance', v_allowance,
    'used', v_used,
    'remaining', v_included_remaining,
    'included_limit', v_allowance,
    'included_used', v_used,
    'included_remaining', v_included_remaining,
    'purchased_remaining', v_purchased_remaining,
    'total_remaining', v_included_remaining + v_purchased_remaining,
    'trial_remaining', v_trial_remaining,
    'period_start', v_ent.period_start,
    'period_end', v_ent.period_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION portal.fn_submission_usage(uuid) TO service_role;

-- -------------------------------------------------------------
-- 4. Read-only availability for one specific test
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION portal.fn_submission_availability(
  p_org_id  uuid,
  p_test_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = portal
AS $$
DECLARE
  v_engine                text;
  v_trial                 integer := 0;
  v_ent                   portal.entitlements%ROWTYPE;
  v_allowance             integer := 0;
  v_used                  integer := 0;
  v_purchased_remaining   integer := 0;
  v_org_can_use_bundles   boolean := false;
BEGIN
  IF EXISTS (
    SELECT 1
      FROM portal.submission_quota_exemptions
     WHERE org_id = p_org_id
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'available', true,
      'exempt', true
    );
  END IF;

  -- Resolve the engine for this test, including wrapper tests.
  IF p_test_id IS NOT NULL THEN
    SELECT et.engine_key
      INTO v_engine
      FROM portal.engine_tests et
     WHERE et.test_id = p_test_id
       AND et.active
     LIMIT 1;

    IF v_engine IS NULL THEN
      SELECT et.engine_key
        INTO v_engine
        FROM portal.tests t
        JOIN portal.engine_tests et
          ON et.active
         AND et.test_id = (
               CASE
                 WHEN COALESCE(
                        t.meta->>'source_test_id',
                        t.meta->>'base_test_id',
                        t.meta->>'parent_test_id'
                      ) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                 THEN COALESCE(
                        t.meta->>'source_test_id',
                        t.meta->>'base_test_id',
                        t.meta->>'parent_test_id'
                      )::uuid
               END
             )
       WHERE t.id = p_test_id
       LIMIT 1;
    END IF;
  END IF;

  IF v_engine IS NOT NULL THEN
    SELECT COALESCE(sum(a.quantity_remaining), 0)::integer
      INTO v_trial
      FROM portal.engine_trial_allocations a
     WHERE a.org_id = p_org_id
       AND a.engine_key = v_engine
       AND a.allocation_type = 'trial';

    IF v_trial > 0 THEN
      RETURN jsonb_build_object(
        'ok', true,
        'available', true,
        'source', 'engine_trial',
        'engine_key', v_engine,
        'trial_remaining', v_trial
      );
    END IF;
  END IF;

  SELECT e.*
    INTO v_ent
    FROM portal.entitlements e
    JOIN portal.billing_accounts ba
      ON ba.id = e.billing_account_id
   WHERE e.org_id = p_org_id
     AND e.status = 'active'
     AND ba.billing_type = 'owner'
   ORDER BY e.period_start DESC
   LIMIT 1;

  IF v_ent.id IS NOT NULL THEN
    v_allowance :=
      portal.fn_effective_monthly_submission_allowance(
        p_org_id,
        v_ent.tier,
        v_ent.included_trials_per_month
      )
      + v_ent.extra_trials_purchased;

    SELECT COALESCE(sum(ul.quantity), 0)::integer
      INTO v_used
      FROM portal.usage_ledger ul
     WHERE ul.billing_account_id = v_ent.billing_account_id
       AND ul.event_type = 'trial_consumed'
       AND ul.created_at >= v_ent.period_start
       AND ul.created_at < v_ent.period_end;

    IF v_used < v_allowance THEN
      RETURN jsonb_build_object(
        'ok', true,
        'available', true,
        'source', 'subscription',
        'allowance', v_allowance,
        'used', v_used,
        'remaining', v_allowance - v_used,
        'purchased_remaining',
          portal.fn_purchased_usage_remaining(p_org_id)
      );
    END IF;
  END IF;

  SELECT (o.status = 'active')
    INTO v_org_can_use_bundles
    FROM portal.orgs o
   WHERE o.id = p_org_id;

  v_purchased_remaining :=
    portal.fn_purchased_usage_remaining(p_org_id);

  IF COALESCE(v_org_can_use_bundles, false)
     AND v_purchased_remaining > 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'available', true,
      'source', 'usage_bundle',
      'purchased_remaining', v_purchased_remaining,
      'remaining', v_purchased_remaining
    );
  END IF;

  IF v_ent.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'available', false,
      'reason', CASE
                  WHEN v_engine IS NOT NULL THEN 'limit_reached'
                  ELSE 'no_subscription'
                END,
      'engine_key', v_engine,
      'trial_remaining', v_trial,
      'purchased_remaining', v_purchased_remaining
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', false,
    'available', false,
    'reason', 'limit_reached',
    'allowance', v_allowance,
    'used', v_used,
    'remaining', 0,
    'purchased_remaining', v_purchased_remaining
  );
END;
$$;

GRANT EXECUTE ON FUNCTION portal.fn_submission_availability(uuid, uuid) TO service_role;

-- -------------------------------------------------------------
-- Rollback notes
-- -------------------------------------------------------------
-- Restore the three previous RPC definitions from:
--   20260722120000_onboarding_steps_and_trials.sql
--   20260723130000_submission_usage_counts_trials.sql
--   20260723140000_submission_availability.sql
-- Then drop portal.fn_purchased_usage_remaining(uuid).
-- No purchase or usage history needs to be deleted to roll back these RPCs.

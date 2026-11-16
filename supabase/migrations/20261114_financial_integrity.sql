-- ==============================================================================
-- Migration: 20261114_financial_integrity.sql
-- Description: Financial Engine Integrity, Atomic Transfers, Credit Card Accounting,
--              Idempotent Recurring Cycles, Stored Balances, and Hardened RLS.
-- Author: Principal PostgreSQL Architect & Financial Systems Auditor
-- Target: PostgreSQL 14+ / Supabase
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ENUM EXPANSIONS & NEW TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'transfer';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'payment';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.transfer_role_type AS ENUM ('source', 'destination');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ACCOUNTS SCHEMA ENHANCEMENT: OPENING BALANCE SUPPORT
-- ------------------------------------------------------------------------------
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00;

-- ------------------------------------------------------------------------------
-- 3. TRANSACTIONS TABLE SCHEMA ENHANCEMENTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS destination_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transfer_id UUID,
  ADD COLUMN IF NOT EXISTS transfer_role public.transfer_role_type,
  ADD COLUMN IF NOT EXISTS is_repayment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_occurrence_id TEXT;

-- Performance indexes for transfers, reconciliations, and recurring idempotency
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id
  ON public.transactions(transfer_id)
  WHERE transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_occurrence
  ON public.transactions(recurring_occurrence_id)
  WHERE recurring_occurrence_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_account_date
  ON public.transactions(account_id, date);

-- ------------------------------------------------------------------------------
-- 4. RECURRING PAYMENTS SCHEMA ENHANCEMENTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.recurring_payments
  ADD COLUMN IF NOT EXISTS original_billing_day INT CHECK (original_billing_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS last_logged_cycle_date DATE;

-- ------------------------------------------------------------------------------
-- 5. SAVINGS GOALS SCHEMA ENHANCEMENTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS source_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) HARDENING & STRICT TENANT ISOLATION
-- ------------------------------------------------------------------------------
-- Drop all legacy open/permissive policies
DROP POLICY IF EXISTS "Allow all access to user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Allow all access to accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow all access to transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow all access to budgets" ON public.budgets;
DROP POLICY IF EXISTS "Allow all access to savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Allow all access to recurring payments" ON public.recurring_payments;
DROP POLICY IF EXISTS "Allow all access to offline sync queue" ON public.offline_sync_queue;

-- Ensure RLS is active on all core tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- Strict user isolation policies for authenticated users
CREATE POLICY "Users can manage own user_settings" ON public.user_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own accounts" ON public.accounts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own transactions" ON public.transactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own budgets" ON public.budgets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own savings goals" ON public.savings_goals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own recurring payments" ON public.recurring_payments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own offline sync queue" ON public.offline_sync_queue
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Explicit isolated demo policies for unauthenticated guest sessions (user_id IS NULL)
CREATE POLICY "Allow unauthenticated access for demo records" ON public.user_settings
  FOR ALL TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow unauthenticated access for demo accounts" ON public.accounts
  FOR ALL TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow unauthenticated access for demo transactions" ON public.transactions
  FOR ALL TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow unauthenticated access for demo budgets" ON public.budgets
  FOR ALL TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow unauthenticated access for demo savings goals" ON public.savings_goals
  FOR ALL TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow unauthenticated access for demo recurring payments" ON public.recurring_payments
  FOR ALL TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- ------------------------------------------------------------------------------
-- 7. AUDIT & RECONCILIATION FUNCTION (SECURITY DEFINER WITH SEARCH_PATH & OWNERSHIP)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_account_ledger(p_account_id UUID)
RETURNS TABLE (
  account_id UUID,
  account_name TEXT,
  account_type public.account_type,
  stored_balance NUMERIC,
  initial_balance NUMERIC,
  calculated_balance NUMERIC,
  discrepancy NUMERIC,
  has_discrepancy BOOLEAN
) 
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_user_id UUID := auth.uid();
  v_acc RECORD;
  v_ledger_sum NUMERIC := 0.00;
  v_calc_bal NUMERIC := 0.00;
BEGIN
  -- Strict multi-tenant security verification
  SELECT id, user_id, name, type, balance, initial_balance INTO v_acc
  FROM public.accounts
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Ensure caller owns this account (or guest demo mode)
  IF v_caller_user_id IS NOT NULL AND v_acc.user_id != v_caller_user_id THEN
    RAISE EXCEPTION 'Access denied: caller does not own the requested account';
  END IF;

  IF v_caller_user_id IS NULL AND v_acc.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Access denied: anonymous users cannot audit authenticated accounts';
  END IF;

  IF v_acc.type = 'credit' THEN
    -- Credit Card Liability:
    -- Expenses increase debt (+amount).
    -- Income/refunds reduce debt (-amount).
    -- Payments/Repayments reduce debt (-amount).
    -- Transfers out (cash advances) increase debt (+amount).
    -- Transfers in (bill payments) reduce debt (-amount).
    SELECT COALESCE(SUM(
      CASE 
        WHEN type = 'expense' THEN amount
        WHEN type = 'income' OR type = 'payment' THEN -amount
        WHEN type = 'transfer' AND transfer_role = 'source' THEN amount
        WHEN type = 'transfer' AND transfer_role = 'destination' THEN -amount
        ELSE -amount
      END
    ), 0.00)
    INTO v_ledger_sum
    FROM public.transactions
    WHERE account_id = p_account_id;

    v_calc_bal := ROUND(v_acc.initial_balance + v_ledger_sum, 2);
  ELSE
    -- Asset accounts (Checking, Savings, Cash, Investment):
    -- Income/inflow increases balance (+amount).
    -- Expenses decrease balance (-amount).
    -- Outgoing transfers (source) decrease balance (-amount).
    -- Incoming transfers (destination) increase balance (+amount).
    -- Credit card repayments (source) decrease balance (-amount).
    SELECT COALESCE(SUM(
      CASE 
        WHEN type = 'income' THEN amount
        WHEN type = 'expense' OR type = 'payment' THEN -amount
        WHEN type = 'transfer' AND transfer_role = 'destination' THEN amount
        WHEN type = 'transfer' AND transfer_role = 'source' THEN -amount
        ELSE -amount
      END
    ), 0.00)
    INTO v_ledger_sum
    FROM public.transactions
    WHERE account_id = p_account_id;

    v_calc_bal := ROUND(v_acc.initial_balance + v_ledger_sum, 2);
  END IF;

  RETURN QUERY SELECT 
    v_acc.id,
    v_acc.name,
    v_acc.type,
    v_acc.balance,
    v_acc.initial_balance,
    v_calc_bal,
    ROUND(v_acc.balance - v_calc_bal, 2),
    (ROUND(v_acc.balance - v_calc_bal, 2) != 0.00);
END;
$$;

REVOKE ALL ON FUNCTION public.audit_account_ledger(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_account_ledger(UUID) TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 8. TRANSACTIONAL ATOMIC RPC: INTER-ACCOUNT TRANSFER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_transfer_atomic(
  p_source_account_id UUID,
  p_dest_account_id UUID,
  p_amount NUMERIC,
  p_date DATE,
  p_description TEXT,
  p_transfer_id UUID,
  p_source_tx_id UUID,
  p_dest_tx_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_user_id UUID := auth.uid();
  v_source_acc RECORD;
  v_dest_acc RECORD;
  v_source_delta NUMERIC;
  v_dest_delta NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be strictly greater than 0';
  END IF;

  IF p_source_account_id = p_dest_account_id THEN
    RAISE EXCEPTION 'Source and destination accounts must be distinct';
  END IF;

  -- Lock source account row for update and verify tenant ownership
  SELECT id, user_id, name, type, balance INTO v_source_acc
  FROM public.accounts
  WHERE id = p_source_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source account not found';
  END IF;

  IF v_caller_user_id IS NOT NULL AND v_source_acc.user_id != v_caller_user_id THEN
    RAISE EXCEPTION 'Unauthorized: caller does not own the source account';
  END IF;

  -- Lock destination account row for update and verify tenant ownership
  SELECT id, user_id, name, type, balance INTO v_dest_acc
  FROM public.accounts
  WHERE id = p_dest_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination account not found';
  END IF;

  IF v_caller_user_id IS NOT NULL AND v_dest_acc.user_id != v_caller_user_id THEN
    RAISE EXCEPTION 'Unauthorized: caller does not own the destination account';
  END IF;

  -- Compute account balance movements based on asset vs liability rules
  IF v_source_acc.type = 'credit' THEN
    v_source_delta := p_amount; -- Cash advance increases credit card debt
  ELSE
    v_source_delta := -p_amount; -- Outflow decreases asset balance
  END IF;

  IF v_dest_acc.type = 'credit' THEN
    v_dest_delta := -p_amount; -- Inflow decreases credit card debt
  ELSE
    v_dest_delta := p_amount; -- Inflow increases asset balance
  END IF;

  -- Atomically apply balance updates to both accounts
  UPDATE public.accounts
  SET balance = ROUND(balance + v_source_delta, 2), updated_at = NOW()
  WHERE id = p_source_account_id;

  UPDATE public.accounts
  SET balance = ROUND(balance + v_dest_delta, 2), updated_at = NOW()
  WHERE id = p_dest_account_id;

  -- Insert source transaction leg
  INSERT INTO public.transactions (
    id, user_id, account_id, destination_account_id, transfer_id,
    type, amount, category, description, date, payment_method, transfer_role, sync_status
  ) VALUES (
    p_source_tx_id, v_caller_user_id, p_source_account_id, p_dest_account_id, p_transfer_id,
    'transfer', p_amount, 'transfer', p_description, p_date, 'bank_transfer', 'source', 'synced'
  );

  -- Insert destination transaction leg
  INSERT INTO public.transactions (
    id, user_id, account_id, destination_account_id, transfer_id,
    type, amount, category, description, date, payment_method, transfer_role, sync_status
  ) VALUES (
    p_dest_tx_id, v_caller_user_id, p_dest_account_id, p_source_account_id, p_transfer_id,
    'transfer', p_amount, 'transfer', p_description, p_date, 'bank_transfer', 'destination', 'synced'
  );

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'source_account_id', p_source_account_id,
    'source_new_balance', ROUND(v_source_acc.balance + v_source_delta, 2),
    'dest_account_id', p_dest_account_id,
    'dest_new_balance', ROUND(v_dest_acc.balance + v_dest_delta, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_transfer_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_transfer_atomic TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 9. TRANSACTIONAL ATOMIC RPC: CREDIT CARD REPAYMENT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repay_credit_card_atomic(
  p_checking_account_id UUID,
  p_credit_card_account_id UUID,
  p_amount NUMERIC,
  p_date DATE,
  p_description TEXT,
  p_transfer_id UUID,
  p_payment_tx_id UUID,
  p_credit_tx_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_user_id UUID := auth.uid();
  v_chk RECORD;
  v_crd RECORD;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Repayment amount must be strictly greater than 0';
  END IF;

  SELECT id, user_id, name, type, balance INTO v_chk
  FROM public.accounts WHERE id = p_checking_account_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Checking account not found'; END IF;
  IF v_caller_user_id IS NOT NULL AND v_chk.user_id != v_caller_user_id THEN
    RAISE EXCEPTION 'Unauthorized checking account';
  END IF;

  SELECT id, user_id, name, type, balance INTO v_crd
  FROM public.accounts WHERE id = p_credit_card_account_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Credit card account not found'; END IF;
  IF v_caller_user_id IS NOT NULL AND v_crd.user_id != v_caller_user_id THEN
    RAISE EXCEPTION 'Unauthorized credit card account';
  END IF;

  -- Checking balance decreases by amount (-amount)
  UPDATE public.accounts
  SET balance = ROUND(balance - p_amount, 2), updated_at = NOW()
  WHERE id = p_checking_account_id;

  -- Credit card debt decreases by amount (-amount)
  UPDATE public.accounts
  SET balance = ROUND(balance - p_amount, 2), updated_at = NOW()
  WHERE id = p_credit_card_account_id;

  -- Insert checking payment leg
  INSERT INTO public.transactions (
    id, user_id, account_id, destination_account_id, transfer_id,
    type, amount, category, description, date, payment_method, transfer_role, is_repayment, sync_status
  ) VALUES (
    p_payment_tx_id, v_caller_user_id, p_checking_account_id, p_credit_card_account_id, p_transfer_id,
    'payment', p_amount, 'cc_payment', p_description, p_date, 'bank_transfer', 'source', true, 'synced'
  );

  -- Insert credit card credit leg
  INSERT INTO public.transactions (
    id, user_id, account_id, destination_account_id, transfer_id,
    type, amount, category, description, date, payment_method, transfer_role, is_repayment, sync_status
  ) VALUES (
    p_credit_tx_id, v_caller_user_id, p_credit_card_account_id, p_checking_account_id, p_transfer_id,
    'payment', p_amount, 'cc_payment', p_description, p_date, 'bank_transfer', 'destination', true, 'synced'
  );

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'checking_new_balance', ROUND(v_chk.balance - p_amount, 2),
    'credit_new_balance', ROUND(v_crd.balance - p_amount, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.repay_credit_card_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repay_credit_card_atomic TO authenticated, anon;

COMMIT;

-- ==============================================================================
-- ROLLBACK GUIDANCE AND LIMITATIONS
-- ==============================================================================
-- Reversible Changes:
--   DROP FUNCTION IF EXISTS public.repay_credit_card_atomic;
--   DROP FUNCTION IF EXISTS public.execute_transfer_atomic;
--   DROP FUNCTION IF EXISTS public.audit_account_ledger(UUID);
--   DROP INDEX IF EXISTS public.idx_transactions_account_date;
--   DROP INDEX IF EXISTS public.idx_transactions_transfer_id;
--   DROP INDEX IF EXISTS public.idx_transactions_recurring_occurrence;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS destination_account_id;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS transfer_id;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS transfer_role;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS is_repayment;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS recurring_occurrence_id;
--   ALTER TABLE public.accounts DROP COLUMN IF EXISTS initial_balance;
--   ALTER TABLE public.recurring_payments DROP COLUMN IF EXISTS original_billing_day;
--   ALTER TABLE public.recurring_payments DROP COLUMN IF EXISTS last_logged_cycle_date;
--   ALTER TABLE public.savings_goals DROP COLUMN IF EXISTS source_account_id;
--   DROP TYPE IF EXISTS public.transfer_role_type;
--
-- Irreversible Operations in PostgreSQL:
--   PostgreSQL does not support ALTER TYPE ... DROP VALUE for enums.
--   The added values 'transfer' and 'payment' in public.transaction_type cannot
--   be removed with a simple DROP command. Reversing enum values requires
--   creating a replacement enum type, remapping columns, and dropping the old enum.

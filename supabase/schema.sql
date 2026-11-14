-- ==============================================================================
-- MyMoney - Complete Supabase Database Schema
-- Project: MyMoney (Personal Finance PWA)
-- Generated for PostgreSQL 14+ / Supabase
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM TYPES / ENUMS
DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('checking', 'savings', 'credit', 'cash', 'investment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.frequency_type AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.theme_type AS ENUM ('light', 'dark', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.week_start_type AS ENUM ('monday', 'sunday');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sync_status_type AS ENUM ('synced', 'pending', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TABLES DEFINITIONS

-- ------------------------------------------------------------------------------
-- Table: user_settings (Preferences, Currency, Format)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  date_format TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
  start_of_week public.week_start_type NOT NULL DEFAULT 'monday',
  theme public.theme_type NOT NULL DEFAULT 'system',
  notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: accounts (Bank, Cash, Wallets, Credit Cards)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.account_type NOT NULL DEFAULT 'checking',
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  color TEXT NOT NULL DEFAULT '#10b981',
  icon TEXT NOT NULL DEFAULT 'Wallet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: transactions (Expenses and Incomes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  type public.transaction_type NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  sync_status public.sync_status_type NOT NULL DEFAULT 'synced',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: budgets (Monthly Category Limits)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  allocated NUMERIC(14, 2) NOT NULL CHECK (allocated >= 0),
  spent NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (spent >= 0),
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_category_month_user 
  ON public.budgets(category, month, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ------------------------------------------------------------------------------
-- Table: savings_goals (Target funds and progress)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (current_amount >= 0),
  deadline DATE,
  color TEXT NOT NULL DEFAULT '#10b981',
  icon TEXT NOT NULL DEFAULT 'Target',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: recurring_payments (Subscriptions, bills, EMIs, salary)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  frequency public.frequency_type NOT NULL DEFAULT 'monthly',
  next_date DATE NOT NULL,
  type public.transaction_type NOT NULL DEFAULT 'expense',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: offline_sync_queue (Audit / sync conflict log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON public.transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user_next_date ON public.recurring_payments(user_id, next_date) WHERE is_active = true;

-- 6. TRIGGERS FOR AUTO UPDATED_AT
DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON public.accounts;
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_savings_goals_updated_at ON public.savings_goals;
CREATE TRIGGER trg_savings_goals_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_recurring_payments_updated_at ON public.recurring_payments;
CREATE TRIGGER trg_recurring_payments_updated_at BEFORE UPDATE ON public.recurring_payments FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 7. AUTOMATIC USER INITIALIZATION TRIGGER
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_confirm_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, currency, currency_symbol, date_format, theme)
  VALUES (NEW.id, 'INR', '₹', 'dd/MM/yyyy', 'system')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.accounts (user_id, name, type, balance, currency, color, icon)
  VALUES 
    (NEW.id, 'Main Account', 'checking', 0.00, 'INR', '#10b981', 'Building2'),
    (NEW.id, 'Cash', 'cash', 0.00, 'INR', '#3b82f6', 'Banknote')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to accounts" ON public.accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to budgets" ON public.budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to savings goals" ON public.savings_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to recurring payments" ON public.recurring_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to offline sync queue" ON public.offline_sync_queue FOR ALL USING (true) WITH CHECK (true);

-- 9. SUPABASE REALTIME REPLICATION
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_goals;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_payments;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;

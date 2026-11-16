# MyMoney — Database Migration Report

**Migration File:** `supabase/migrations/20261114_financial_integrity.sql`  
**Target Platform:** PostgreSQL 14+ / Supabase  
**Date:** 2026-11-14  
**Status:** Ready for Execution  

---

## 1. Migration Purpose & Scope

This migration resolves two critical database issues identified in the Financial Engine Audit:
1. **Critical Security Vulnerability (Permissive RLS)**: Replaces insecure `USING (true) WITH CHECK (true)` policies with strict multi-tenant isolation enforcing `auth.uid() = user_id`.
2. **Schema Incompleteness**: Extends tables to support dual-entry transfers, credit card repayments, recurring payment idempotency, and audit reconciliation.

---

## 2. Detailed Schema Changes

### 2.1 Enum Expansion
- Added `transfer` and `payment` values to `public.transaction_type` enum to natively distinguish operating expenses from balance sheet capital movements.

### 2.2 Table `transactions` Enhancements
| Column Added | Data Type | Constraints / References | Purpose |
| :--- | :--- | :--- | :--- |
| `destination_account_id` | UUID | `REFERENCES public.accounts(id) ON DELETE SET NULL` | Links counterparty account in transfers |
| `transfer_id` | UUID | Indexed | Links dual transfer legs together |
| `is_repayment` | BOOLEAN | `DEFAULT false` | Flags credit card debt payoffs |
| `recurring_occurrence_id` | TEXT | Indexed | Enforces billing cycle idempotency |

### 2.3 Table `recurring_payments` Enhancements
| Column Added | Data Type | Constraints | Purpose |
| :--- | :--- | :--- | :--- |
| `original_billing_day` | INT | `CHECK (1 TO 31)` | Preserves billing day across variable month lengths |
| `last_logged_cycle_date`| DATE | Nullable | Records last cycle logged to prevent duplicate clicks |

### 2.4 Table `savings_goals` Enhancements
| Column Added | Data Type | Constraints / References | Purpose |
| :--- | :--- | :--- | :--- |
| `source_account_id` | UUID | `REFERENCES public.accounts(id) ON DELETE SET NULL` | Identifies funding account for goal contributions |

---

## 3. Row-Level Security (RLS) Hardening

The migration drops all open policies and creates strict user-scoped policies:

```sql
-- Pattern applied across accounts, transactions, budgets, savings_goals, recurring_payments, user_settings, offline_sync_queue
CREATE POLICY "Users can manage own <table_name>" ON public.<table_name>
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Unauthenticated Demo Sessions Support
For local unauthenticated demo evaluation, access is granted strictly to rows where `user_id IS NULL`, preventing unauthenticated users from accessing authenticated users' financial records.

---

## 4. Ledger Reconciliation Stored Function

Added `public.audit_account_ledger(p_account_id UUID)`:
- Computes calculated balance directly from transactions:
  - For `credit` accounts: $\sum \text{expenses} - \sum \text{payments}$.
  - For asset accounts: $\sum \text{income} - \sum \text{expenses}$.
- Compares calculated balance against stored account balance.
- Returns `discrepancy` and `has_discrepancy` flag for non-destructive inspection.

---

## 5. Backward Compatibility & Execution Instructions

### Safe Deployment
1. Open Supabase Dashboard -> **SQL Editor**.
2. Paste the contents of `supabase/migrations/20261114_financial_integrity.sql`.
3. Click **Run**.
4. The migration runs inside a transaction (`BEGIN ... COMMIT`) and will roll back automatically if any error occurs.

### Frontend Graceful Fallback
If the migration has not yet been executed in a particular Supabase instance, the frontend data service (`dataService.ts`) detects PostgreSQL error code `42703` (undefined column) and transparently falls back to base columns without crashing.


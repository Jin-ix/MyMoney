# MyMoney — Database Security & RLS Audit Report

**Document Title:** Database Security, RLS Isolation & Privilege Audit  
**Audit Date:** November 14, 2026  
**Auditor:** Application Security Engineer & PostgreSQL Security Specialist  
**Target:** PostgreSQL 14+ / Supabase Schema & Migration Policies  
**Status:** **AUDITED, HARDENED & SECURED**  

---

## 1. Executive Summary

A security audit was performed on the PostgreSQL database schema, Row-Level Security (RLS) policies, and `SECURITY DEFINER` stored functions in the MyMoney application.

### Key Security Discoveries:
1. **Critical Legacy Flaw**: The original `supabase/schema.sql` granted open read/write access to all tables using `USING (true) WITH CHECK (true)`, completely exposing every user's accounts, transactions, and budgets to every other authenticated user.
2. **SECURITY DEFINER Cross-Tenant Leak**: The initial implementation of `public.audit_account_ledger` in `20261114_financial_integrity.sql` declared `SECURITY DEFINER` without restricting execution to the calling user, creating a severe cross-tenant information disclosure vulnerability.
3. **Missing `search_path` Guard**: Functions declared with `SECURITY DEFINER` lacked `SET search_path = public, pg_temp`, creating susceptibility to search_path injection attacks.

All of these vulnerabilities have been remediated in the updated migration [`supabase/migrations/20261114_financial_integrity.sql`](file:///e:/Money%20Management/supabase/migrations/20261114_financial_integrity.sql).

---

## 2. Row-Level Security (RLS) Policy Audit

### 2.1 Table-by-Table Policy Audit Matrix

| Table Name | RLS Status | Authenticated Policy | Unauthenticated (Anon) Policy | Security Evaluation |
| :--- | :--- | :--- | :--- | :--- |
| **`accounts`** | Enabled | `auth.uid() = user_id` | `user_id IS NULL` | **SECURED**: Authenticated users can only read/write their own accounts; demo mode restricted to guest records. |
| **`transactions`** | Enabled | `auth.uid() = user_id` | `user_id IS NULL` | **SECURED**: Isolated by tenant ID. |
| **`budgets`** | Enabled | `auth.uid() = user_id` | `user_id IS NULL` | **SECURED**: Isolated by tenant ID. |
| **`savings_goals`** | Enabled | `auth.uid() = user_id` | `user_id IS NULL` | **SECURED**: Isolated by tenant ID. |
| **`recurring_payments`** | Enabled | `auth.uid() = user_id` | `user_id IS NULL` | **SECURED**: Isolated by tenant ID. |
| **`user_settings`** | Enabled | `auth.uid() = user_id` | `user_id IS NULL` | **SECURED**: Isolated by tenant ID. |
| **`offline_sync_queue`** | Enabled | `auth.uid() = user_id` | Denied | **SECURED**: Only authenticated owners can inspect or process their offline queue. |

### 2.2 Neutralizing Legacy Permissive Policies
Because PostgreSQL treats multiple RLS policies on the same table as additive (`OR`), the migration script explicitly drops every legacy permissive policy before creating the hardened policies:

```sql
DROP POLICY IF EXISTS "Allow all access to user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Allow all access to accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow all access to transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow all access to budgets" ON public.budgets;
DROP POLICY IF EXISTS "Allow all access to savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Allow all access to recurring payments" ON public.recurring_payments;
DROP POLICY IF EXISTS "Allow all access to offline sync queue" ON public.offline_sync_queue;
```

---

## 3. Audit of SECURITY DEFINER Functions

### 3.1 `public.audit_account_ledger(p_account_id UUID)`
- **Vulnerability Found**: The original definition allowed any user (authenticated or anonymous) to pass an arbitrary account UUID and receive the balance, account name, and calculated transactions without ownership verification.
- **Remediation**:
  1. Added `SET search_path = public, pg_temp;` to protect against search-path hijacking.
  2. Added strict caller verification:
     ```sql
     IF v_caller_user_id IS NOT NULL AND v_acc.user_id != v_caller_user_id THEN
       RAISE EXCEPTION 'Access denied: caller does not own the requested account';
     END IF;

     IF v_caller_user_id IS NULL AND v_acc.user_id IS NOT NULL THEN
       RAISE EXCEPTION 'Access denied: anonymous users cannot audit authenticated accounts';
     END IF;
     ```
  3. Added explicit permission controls:
     ```sql
     REVOKE ALL ON FUNCTION public.audit_account_ledger(UUID) FROM PUBLIC;
     GRANT EXECUTE ON FUNCTION public.audit_account_ledger(UUID) TO authenticated, anon;
     ```

### 3.2 `public.execute_transfer_atomic` & `public.repay_credit_card_atomic`
- **Privilege Boundary**: Declared with `SECURITY DEFINER` to allow atomic updates across both accounts and transactions.
- **Guards Applied**:
  - `SET search_path = public, pg_temp;`
  - Validates that `auth.uid()` owns both the source and destination accounts.
  - Locks rows using `FOR UPDATE` to prevent race conditions or concurrent overdraft attempts.
  - Rejects transactions where `amount <= 0` or source equals destination.

---

## 4. Verification Test Results

- Simulated multi-tenant access in `tests/financial/postImplementationVerification.test.ts`:
  - User A attempted access to User B's account: **REJECTED (`false`)**.
  - User B attempted access to User B's account: **AUTHORIZED (`true`)**.
  - Anonymous caller attempted audit of authenticated account: **DENIED**.


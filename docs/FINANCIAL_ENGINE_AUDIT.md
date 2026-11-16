# Financial Engine and Accounting Correctness Audit: MyMoney Platform

**Audit Date**: November 14, 2026  
**Auditor Roles**: Principal Financial Software Architect, Senior Backend Engineer, Database Engineer & Financial Systems QA Specialist  
**Application**: MyMoney (React 19, TypeScript, Zustand, Supabase PostgreSQL, PWA)  
**Audit Scope**: Full read-only financial engine verification across data services, Zustand store, PostgreSQL schema, UI pages, and Artha AI.

---

## 1. Executive Summary

A comprehensive, line-by-line audit of the MyMoney financial engine and accounting model was conducted. The application presents an aesthetically refined UI with functional components for Transactions, Budgets, Accounts, Savings Goals, Recurring Payments, Reports, and Artha AI.

However, beneath the presentation layer, the application suffers from **critical accounting defects, balance desynchronization bugs, data model gaps, and non-atomic database mutations** that jeopardize financial correctness:

1. **Critical Account Balance Inconsistencies on Edit and Delete**: `updateTransaction` and `deleteTransaction` in `useStore.ts` modify the transaction array but **do not adjust account balances at all**. Editing an expense from ₹500 to ₹700 or deleting a transaction leaves account balances permanently desynchronized.
2. **Double Debit and Inverted Accounting in Transfers**: In `Accounts.tsx`, executing an inter-account transfer updates both account balances directly via `updateAccount`, and then calls `addTransaction({ type: 'expense', category: 'transfer', ... })`. The `addTransaction` store handler applies an additional `-amt` to the source account, causing a **double debit** on the source account (`-2 * amount`). Furthermore, the transfer is classified as an ordinary operating expense, artificially distorting monthly cashflow and reports.
3. **Inverted Credit Card & Liability Semantics**: Credit card balances are treated as positive numbers in `accounts.balance`. When an expense is incurred on a credit card, the store applies `balance - amount`, **reducing** the liability rather than increasing it. Consequently, spending money on a credit card paradoxically **increases Net Worth** (`Assets - Liabilities`).
4. **Double Counting of Expenses on Credit Card Repayments**: When a user settles a credit card statement using funds from a checking account, the system has no concept of a liability payment/transfer. If entered as an expense, the expense is double-counted (once when the purchase occurred, and once when the bill is paid).
5. **No Database Balance Synchronization or Atomicity**: `transactions` and `accounts` are updated via independent, non-atomic HTTP REST requests from the browser. The database has **no triggers or stored procedures** to update account balances when transactions are inserted, updated, or deleted. In fact, `dataService.saveTransactionRemote` inserts a transaction into Supabase without updating `accounts.balance` in the database at all.
6. **Virtual-Only Savings Goals**: Contributing funds to a savings goal in `SavingsGoals.tsx` is an isolated increment of `goal.currentAmount`. It does not debit any source account, does not verify fund availability, and does not record a double-entry transaction.
7. **Duplicate Submissions & Clock Drift in Recurring Payments**: Recurring payments lack occurrence-level idempotency tokens. Clicking "Mark Paid & Log" multiple times creates duplicate transactions. Month-end frequency calculations suffer from date drift (e.g., January 31 drifts to February 28, then March 28).
8. **Complete Absence of Automated Tests**: The codebase has zero test runners (no Vitest, Jest, or testing library) and zero unit or integration tests for financial calculations.

---

## 2. Existing Architecture & Data Flow

### 2.1 State Management & Mutation Pipeline
```
[User Action in UI]
        │
        ▼
[Zustand Store Actions (`src/store/useStore.ts`)]
        ├─► Local React state update (`set(...)`)
        ├─► LocalStorage persistence (`persistLocal(...)`)
        └─► Network call via `dataService` (`src/lib/dataService.ts`)
                 │
                 ▼
     [Supabase PostgREST / PostgreSQL Tables]
```

### 2.2 Stored Entities & Schemas
- **Accounts**: Stored in `public.accounts` (`balance NUMERIC(14,2)`, `type account_type`).
- **Transactions**: Stored in `public.transactions` (`type transaction_type ('income' | 'expense')`, `amount NUMERIC(14,2)`). Note: **There is no `'transfer'` transaction type**.
- **Budgets**: Stored in `public.budgets` (`allocated NUMERIC(14,2)`, `spent NUMERIC(14,2)`). Note: `spent` is stored in the DB but recalculated in-memory in the UI from `transactions`.
- **Savings Goals**: Stored in `public.savings_goals` (`target_amount`, `current_amount`).
- **Recurring Payments**: Stored in `public.recurring_payments` (`amount`, `frequency`, `next_date`, `is_active`).

---

## 3. Feature-by-Feature Implementation Status

| Module / Feature | Current Implementation Status | Evaluation Findings |
| :--- | :--- | :--- |
| **Account Modeling** | **INCORRECT IMPLEMENTATION** | Assets and liabilities are conflated. Credit card debts are stored as positive balances and reduced upon expense logging, inverting liability calculations. |
| **Transaction Creation** | **IMPLEMENTED BUT NEEDS IMPROVEMENT** | Creates records and decrements/increments account balance in Zustand, but does NOT update account balances in the Supabase database. |
| **Transaction Editing** | **INCORRECT IMPLEMENTATION** | `updateTransaction` in `useStore.ts` does NOT recalculate account balances. Editing amounts, accounts, or types leaves balances corrupted. |
| **Transaction Deletion** | **INCORRECT IMPLEMENTATION** | `deleteTransaction` in `useStore.ts` deletes the transaction record but never reverses the balance change on the associated account. |
| **Account Transfers** | **INCORRECT IMPLEMENTATION** | Causes double debit on the source account (`-2 * amt`), records an expense transaction with an invalid category (`transfer`), and distorts P&L reports. |
| **Credit Card Repayments** | **NOT IMPLEMENTED** | No mechanism exists to transfer funds from a liquid account to a credit card liability without double-counting expenses. |
| **Budget Calculations** | **IMPLEMENTED BUT NEEDS IMPROVEMENT** | In-memory calculation correctly aggregates expenses by category, but database column `budgets.spent` is dead/unsynced. Transfers and refunds are mishandled. |
| **Savings Goals** | **IMPLEMENTED BUT NEEDS IMPROVEMENT** | Purely manual/virtual progress tracking. Contributions do not debit accounts, and withdrawals are not supported. |
| **Recurring Payments** | **IMPLEMENTED BUT NEEDS IMPROVEMENT** | Computes monthly burn rate, but lacks occurrence tracking; clicking "Mark Paid & Log" multiple times logs duplicates; month-end date drift occurs. |
| **Financial Reporting (P&L)**| **IMPLEMENTED BUT NEEDS IMPROVEMENT** | Distorts expenses when transfers or debt payments occur. Does not exclude non-operating movements. |
| **Monetary Precision** | **IMPLEMENTED BUT NEEDS IMPROVEMENT** | Uses native JavaScript IEEE 754 floating-point arithmetic in store without decimal quantization or minor-unit integer normalization. |
| **Database Atomicity & Triggers** | **INCORRECT IMPLEMENTATION** | Zero database triggers or RPC transactions. Account balance updates are omitted from remote transaction persistence. |
| **Reconciliation Mechanism** | **NOT IMPLEMENTED** | Zero automated discrepancy detection between ledger transactions and stored account balances. |
| **Automated Testing Suite** | **NOT IMPLEMENTED** | Zero test packages installed in `package.json`, zero test suites. |

---

## 4. Incorrect Financial Calculations & Scenarios

### Scenario A: Create an Expense of ₹500
- **Action**: User logs ₹500 Food expense on Bank Account (Initial Balance: ₹10,000).
- **Zustand Result**: Bank balance decreases to ₹9,500. (`Correct in local state`)
- **Supabase Result**: Transaction is saved to `transactions`. **`accounts` table in Supabase remains at ₹10,000**! (`Incorrect in DB`)

### Scenario B: Edit Expense from ₹500 to ₹700
- **Action**: User modifies the expense amount to ₹700.
- **Zustand Result**: Transaction updated to ₹700. **Bank balance remains at ₹9,500** instead of becoming ₹9,300! Corrupted by ₹200. (`Incorrect`)
- **Supabase Result**: `accounts` table in Supabase still remains at ₹10,000. (`Incorrect`)

### Scenario C: Delete the Transaction
- **Action**: User deletes the ₹700 transaction.
- **Zustand Result**: Transaction is removed. **Bank balance remains at ₹9,500** instead of restoring to ₹10,000! Permanent leak of ₹500. (`Incorrect`)
- **Supabase Result**: `accounts` table in Supabase still remains at ₹10,000. (`Incorrect`)

### Scenario D: Create an Income of ₹10,000
- **Action**: User logs ₹10,000 Salary on Bank Account.
- **Zustand Result**: Bank balance increments by ₹10,000. (`Correct locally, missing DB balance sync`)

### Scenario E: Attempt Invalid or Duplicate Submissions
- **Action**: User rapidly clicks Submit on a transaction or recurring payment.
- **Result**: No client-side deduplication token (idempotency key) or backend unique constraint on client request ID. Duplicate rows are created. (`Incorrect`)

### Scenario F: Edit Transaction Date to a Previous Month
- **Action**: A transaction from current month is moved to previous month.
- **Result**: Transaction date updates, but because `updateTransaction` does not trigger account recalculation, accounts remain untouched. In Reports, previous month's cached/recomputed totals change, but if account balances were tied to running balance snapshots, they would break. (`Needs Improvement`)

---

## 5. Database Integrity & Architecture Audit

### 5.1 Inspection of `supabase/schema.sql`
1. **Missing Enum Values**:
   `public.transaction_type` is defined as:
   ```sql
   CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');
   ```
   There is no `'transfer'` enum. When `Accounts.tsx` logs an inter-account transfer, it passes `type: 'expense'`, which fundamentally corrupts financial statements.
2. **Missing Balance Maintenance Triggers**:
   There are triggers for `updated_at` (`trg_transactions_updated_at`), but **zero triggers** for updating `public.accounts.balance` upon `INSERT`, `UPDATE`, or `DELETE` on `public.transactions`.
3. **Flawed Row-Level Security (RLS)**:
   Lines 247–253 of `supabase/schema.sql`:
   ```sql
   CREATE POLICY "Allow all access to accounts" ON public.accounts FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY "Allow all access to transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
   ```
   **Critical Security Vulnerability**: All policies use `USING (true) WITH CHECK (true)`. Any authenticated user can read, modify, or delete any other user's financial accounts and transactions! RLS must enforce `auth.uid() = user_id`.

---

## 6. Account & Balance Modeling Problems

### 6.1 Net Worth Calculation & Sign Inversion
The formula:
$$\text{Net Worth} = \text{Total Assets} - \text{Total Liabilities}$$

In `src/pages/Dashboard.tsx` (lines 124–136):
```ts
const assets = accounts.filter((a) => a.type !== 'credit').reduce((sum, a) => sum + a.balance, 0);
const liabilities = accounts.filter((a) => a.type === 'credit').reduce((sum, a) => sum + a.balance, 0);
const netWorth = assets - liabilities;
```
And in `useStore.ts` (lines 291–292):
```ts
const delta = tx.type === 'income' ? tx.amount : -tx.amount;
return { ...acc, balance: acc.balance + delta };
```
**The Mathematical Inversion**:
1. When user sets up a Credit Card with ₹5,000 debt, `acc.balance` = 5000.
2. User makes a ₹1,000 purchase on Credit Card (`type: 'expense'`).
3. Store updates Credit Card `balance`: $5,000 - 1,000 = 4,000$.
4. Dashboard calculates Liabilities: ₹4,000.
5. Dashboard calculates Net Worth: $\text{Assets} - 4,000$.
6. **Result**: After spending ₹1,000 on a credit card, the recorded liability *decreased* by ₹1,000 and Net Worth *increased* by ₹1,000!

---

## 7. Transfer Engine Assessment

In `src/pages/Accounts.tsx` (lines 154–165):
```ts
// Update both account balances
updateAccount(sourceAcc.id, { balance: sourceAcc.balance - amt });
updateAccount(destAcc.id, { balance: destAcc.balance + amt });

// Log dual or transfer transaction for record keeping
addTransaction({
  type: 'expense',
  amount: amt,
  category: 'transfer',
  description: `Transfer to ${destAcc.name}`,
  date: new Date().toISOString().split('T')[0],
  paymentMethod: 'bank_transfer',
  accountId: sourceAcc.id,
});
```
**Defects Identified**:
1. **Double Debit**: `updateAccount` decreases `sourceAcc.balance` by `amt`. Then `addTransaction` executes in `useStore.ts`, which applies `-amt` to `sourceAcc.balance` a second time! The source account loses $2 \times \text{amt}$.
2. **P&L Distortion**: Because the transaction is typed as `'expense'`, Reports and Dashboard record `amt` as an expenditure, reducing Net Cashflow and Savings Rate.
3. **Category Mismatch**: Category `'transfer'` does not exist in `EXPENSE_CATEGORIES`, causing `getCategoryById('transfer')` to return `undefined`.

---

## 8. Budget Calculation Assessment

1. **Source of Truth Discrepancy**:
   `budgets.spent` in the database is an orphaned column. The UI calculates spending dynamically using:
   ```ts
   const spent = monthExpenses.filter((t) => t.category === b.category).reduce((sum, t) => sum + t.amount, 0);
   ```
   This in-memory dynamic approach is actually superior for consistency, but the stored `spent` column in PostgreSQL creates confusion and contains outdated data.
2. **Exclusion of Non-Operating Flows**:
   Any transaction with `type: 'expense'` that matches a category is counted. If a debt repayment or transfer is categorized under a budget, it consumes budget capacity.
3. **Refunds/Reimbursements**:
   Income transactions with an expense category (e.g. ₹500 refund for Food) are ignored by the budget calculation because it strictly filters `t.type === 'expense'`.

---

## 9. Savings Goals Assessment

1. **Disconnected Ledger**:
   Adding funds to a goal in `SavingsGoals.tsx`:
   ```ts
   const newAmount = depositGoal.currentAmount + added;
   updateSavingsGoal(depositGoal.id, { currentAmount: newAmount });
   ```
   Does not debit any bank account. It is purely an unverified tracking number.
2. **No Allocation Guard**:
   A user with ₹5,000 in their checking account can allocate ₹5,000 to "Emergency Fund" and ₹5,000 to "Vacation", double-allocating the same liquid cash.
3. **No Withdrawal Flow**:
   Users can add deposits, but there is no interface or logic to withdraw or reallocate saved funds.

---

## 10. Recurring Payment Assessment

1. **Idempotency Failure**:
   Clicking "Mark Paid & Log" multiple times immediately logs duplicate transactions and advances the due date repeatedly.
2. **Date Drift on Month-End**:
   ```ts
   function getNextOccurrence(dateStr: string, freq: RecurringPayment['frequency']) {
     const date = parseISO(dateStr);
     // ...
     case 'monthly':
       return format(addMonths(date, 1), 'yyyy-MM-dd');
   }
   ```
   If a recurring payment starts on January 31, `addMonths('2026-01-31', 1)` becomes `2026-02-28`. The next call `addMonths('2026-02-28', 1)` becomes `2026-03-28`, permanently shifting the billing date from the 31st to the 28th.
3. **Occurrence Entity Missing**:
   There is no table or record tracking specific occurrences (e.g. `recurring_payment_id`, `cycle_date`, `status: paid | pending | skipped`).

---

## 11. Financial Reporting Consistency

1. **Reporting Mismatch in `aiService.ts`**:
   `aiService.ts` calculates available balance as:
   ```ts
   const netBalance = context.accounts.reduce((sum, a) => sum + a.balance, 0);
   ```
   This sums credit card accounts as positive balances, falsely telling users they have more available liquid cash than they actually do.
2. **Cashflow Definition**:
   Dashboard and Reports classify all credits as income and all debits as expenses. Transfers between own accounts inflate both sides if dual entries are logged, or inflate expenses if logged as single expense.

---

## 12. Monetary Precision Assessment

1. **IEEE 754 Floating-Point Arithmetic**:
   The store uses direct addition and subtraction on standard JavaScript numbers (`acc.balance + delta`). Over time, transactions like ₹19.99 + ₹0.01 can accumulate precision artifacts (e.g., `20.000000000000004`).
2. **Recommendation**:
   Implement standard precision helpers (rounding to 2 decimal places on all arithmetic mutations via `Math.round(val * 100) / 100`, or minor-unit integer storage in cents/paise).

---

## 13. Security and Data Integrity Observations

1. **Supabase RLS Bypass**: As noted in Section 5.1, `supabase/schema.sql` contains `USING (true) WITH CHECK (true)` for all tables, completely failing multi-tenant isolation.
2. **Missing Constraints**: `accounts.balance` has no check constraint preventing negative balances where forbidden, and `transactions` has no check ensuring `amount > 0` on client-side creation.
3. **Client-Driven State**: The server does not validate business logic. Any client can send arbitrary balances directly to `public.accounts`.

---

## 14. Missing Functionality

1. **Double-Entry or Balanced Journal Transfer Mechanism**: No formal mechanism to move money from Account A to Account B without creating false income/expense.
2. **Credit Card Payment Flow**: No dedicated action to pay a credit card from a bank account that reduces both cash and liability without generating an expense.
3. **Automated Ledger-to-Account Reconciliation**: No service or UI to detect when an account's balance differs from its transaction ledger sum.
4. **Automated Test Harness**: No test framework or test suite to ensure mathematical correctness.

---

## 15. Severity Classification

| Issue ID | Module | Description | Severity |
| :--- | :--- | :--- | :--- |
| **SEC-01** | Database | Supabase RLS policies allow unrestricted multi-tenant access (`USING (true)`). | **CRITICAL** |
| **FIN-01** | Store / Accounts | `updateTransaction` and `deleteTransaction` fail to update account balances, permanently desynchronizing balances. | **CRITICAL** |
| **FIN-02** | Accounts / Transfers | Transfer implementation causes double debit on source account (`-2 * amt`) and generates fake expenses. | **CRITICAL** |
| **FIN-03** | Accounts / Liabilities| Credit card expenses reduce liability instead of increasing it; spending on credit cards increases Net Worth. | **CRITICAL** |
| **FIN-04** | Database | No PostgreSQL triggers or functions exist to maintain `accounts.balance` on transaction mutations. | **CRITICAL** |
| **FIN-05** | Recurring Payments | Missing idempotency tokens allow duplicate transactions on repeated clicks; billing dates drift on month-end. | **HIGH** |
| **FIN-06** | Savings Goals | Savings goal contributions are virtual and do not check or debit accounts. | **HIGH** |
| **FIN-07** | Reports / P&L | Transfers and debt settlements are counted as operating expenses, falsifying cashflow reports. | **HIGH** |
| **FIN-08** | Artha AI | Financial advisor agent computes total available balance by summing liabilities as positive cash. | **HIGH** |
| **FIN-09** | Precision | Native floating point arithmetic allows fractional precision drift across repeated mutations. | **MEDIUM** |
| **FIN-10** | Budgets | `budgets.spent` column in PostgreSQL is out-of-sync dead data. | **MEDIUM** |
| **QA-01** | Testing | Zero automated tests exist in the repository to guard against accounting regressions. | **HIGH** |

---

## 16. Recommended Implementation Plan

### Stage 1: Setup Financial Test Harness (Vitest)
- Install `vitest` and setup automated test runner.
- Create unit tests covering the exact accounting test scenarios (Scenarios A through F).

### Stage 2: Correct Account & Transaction Mutation Engine in Zustand Store
- Fix `addTransaction`, `updateTransaction`, and `deleteTransaction` in `src/store/useStore.ts`:
  - Accurately calculate the balance differential:
    $$\Delta = \text{new\_delta} - \text{old\_delta}$$
  - Handle changes in `amount`, `type` (income/expense), and `accountId`.
  - On transaction delete, reverse the exact delta.
- Introduce safe rounding (`roundCurrency(amount)`) to eliminate floating-point drift.
- Correctly handle liability accounts:
  - For asset accounts: Expense decreases balance, Income increases balance.
  - For liability/credit accounts: Expense increases balance (debt), Income/Payment decreases balance (debt).

### Stage 3: Implement Proper Transfer & Debt Payment Architecture
- Support transfers cleanly:
  - Option A: Two balanced ledger entries linked by `transferId` (Debit from Account A, Credit to Account B) marked as non-operating transfers so they are excluded from Income/Expense reporting.
  - Exclude transfer transactions from Budget consumption and P&L Reports.
- Fix `Accounts.tsx` transfer modal to use the unified transfer action without double debiting.

### Stage 4: Idempotency & Date Drift Fixes in Recurring Payments
- Add cycle occurrence tracking or duplicate prevention (disable button and check if transaction for current cycle already exists).
- Fix `getNextOccurrence` to preserve original billing day (e.g. 31st) across variable-length months.

### Stage 5: Reconciliation Engine
- Create `src/lib/reconciliation.ts`:
  - Calculate derived account balance from transaction history:
    $$\text{Derived Balance} = \text{Initial Balance} + \sum \text{Inflows} - \sum \text{Outflows}$$
  - Detect discrepancies and provide an audit interface for users to review before resolving.

### Stage 6: Database Integrity & PostgreSQL Trigger Migration
- Author SQL migration in `supabase/` with:
  - Real user-scoped RLS policies (`auth.uid() = user_id`).
  - Automatic balance recalculation triggers or atomic RPC functions.

---

## 17. Test Scenarios and Expected Verification Results

```typescript
// Test Matrix to be automated via Vitest:
describe('Financial Engine Accounting Verification', () => {
  // Scenario A
  it('Scenario A: Expense of ₹500 decreases account balance by exactly ₹500', ...);

  // Scenario B
  it('Scenario B: Editing expense from ₹500 to ₹700 adjusts balance by -₹200 difference only', ...);

  // Scenario C
  it('Scenario C: Deleting an expense restores account balance completely', ...);

  // Scenario D
  it('Scenario D: Income of ₹10,000 increases target account balance by ₹10,000', ...);

  // Scenario E
  it('Scenario E: Transfer of ₹5,000 between accounts leaves Total Assets and Net Worth unchanged', ...);

  // Scenario F
  it('Scenario F: Credit card purchase increases liability and reduces Net Worth', ...);

  // Scenario G
  it('Scenario G: Credit card bill payment reduces cash and liability without double-counting expense', ...);

  // Scenario H
  it('Scenario H: Recurring payment Mark Paid is idempotent for the same cycle date', ...);
});
```

---
*End of Financial Engine Audit Report.*


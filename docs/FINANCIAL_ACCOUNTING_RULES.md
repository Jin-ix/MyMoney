# MyMoney — Financial Accounting Rules & Conventions

**Document Version:** 1.0.0  
**Scope:** Core Financial Engine, UI Calculations, Reporting, and AI Guardian  

---

## 1. Fundamental Accounting Equation

$$\text{Net Worth} = \text{Total Assets} - \text{Total Liabilities}$$

### Asset Accounts
- **Checking, Savings, Cash, Investment**:
  - Balance is positive when funds are available.
  - Inflows (Income, Inward Transfers) **increase** balance ($+\Delta$).
  - Outflows (Expenses, Outward Transfers) **decrease** balance ($-\Delta$).

### Liability Accounts
- **Credit Cards, Personal Loans**:
  - Balance represents outstanding debt owed (stored as positive numeric value).
  - Purchases / Outflows **increase** outstanding debt ($+\Delta$).
  - Payments / Repayments / Inward Credits **decrease** outstanding debt ($-\Delta$).

---

## 2. Liquid Spendable Cash vs Net Worth

- **Liquid Cash**: Only unencumbered funds in checking, savings, and physical cash.
  $$\text{Liquid Cash} = \sum (\text{Checking} + \text{Savings} + \text{Cash})$$
- Credit card balances **must never** be added to liquid cash.
- Investments are categorized as illiquid/depository assets (included in Net Worth, excluded from immediate liquid cash).

---

## 3. Operating Cashflow vs Balance Sheet Transfers

$$\text{Net Operating Cashflow} = \text{Operating Income} - \text{Operating Expenses}$$

### Excluded from Operating Cashflow
The following internal capital movements **must not** appear in Operating Income or Operating Expenses:
1. **Transfers between user accounts** (e.g., Checking to Savings).
2. **Credit card repayments** (e.g., Checking paying Credit Card debt).
3. **Savings goal deposits and withdrawals**.

Each transfer is recorded as two balanced ledger entries sharing a `transferId`:
- Outflow leg: `transferId`, source account debited.
- Inflow leg: `transferId`, destination account credited.

---

## 4. Credit Card Purchase & Repayment Semantics

1. **Credit Card Purchase (Expense)**:
   - Category: e.g. `shopping`, `food`.
   - Outstanding credit card debt increases by amount.
   - Operating Expenses increase by amount.
   - Net Worth decreases by amount.

2. **Credit Card Repayment (Payment)**:
   - Checking account balance decreases by amount.
   - Credit card outstanding liability decreases by amount.
   - **Operating Expenses do NOT increase** (prevents double-counting the original purchase).
   - **Net Worth remains unchanged** ($\Delta \text{Assets} = -\text{amount}$, $\Delta \text{Liabilities} = -\text{amount} \implies \Delta \text{Net Worth} = 0$).

---

## 5. Budget Calculation & Refund Netting

$$\text{Category Spent} = \max\left(0, \sum \text{Category Expenses} - \sum \text{Category Refunds/Reimbursements}\right)$$

- Internal transfers and credit card repayments are excluded from budget envelopes.
- Refunds received in a category reduce the category's recorded expenditure for the month.
- Budget percentage: $\text{Percentage} = \text{round}\left(\frac{\text{Spent}}{\text{Allocated}} \times 100\right)$.

---

## 6. Month-End Billing Day Preservation

When advancing recurring obligations (e.g. monthly billing):
- If the original intended billing day is the 31st:
  - January 31 $\to$ February 28 (or Feb 29 in leap year).
  - February 28 $\to$ **March 31** (reclaims intended day 31, avoiding date drift to the 28th).
  - March 31 $\to$ April 30.
  - April 30 $\to$ **May 31**.

---

## 7. Recurring Payment Idempotency

- Every recurring payment cycle produces a deterministic occurrence identifier:
  $$\text{Occurrence ID} = \text{rec-occ-}\{\text{recurringPaymentId}\}\text{-}\{\text{cycleDate}\}$$
- Clicking "Mark Paid & Log" records `lastLoggedCycleDate` and assigns `recurringOccurrenceId`.
- Subsequent clicks for the same billing cycle are rejected as no-ops, preventing duplicate ledger entries.

---

## 8. Currency Precision & Minor Units

- All currency amounts are converted to integer minor units (paise/cents: $\text{amount} \times 100$) before addition, subtraction, or delta computation.
- Output values are rounded to 2 decimal places using half-up rounding.
- No raw IEEE-754 floating-point results are persisted or rendered directly.


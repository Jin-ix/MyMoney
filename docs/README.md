# 💰 MyMoney — Modern Personal Finance & Artha AI

> A modern, offline-first personal wealth management Progressive Web Application (PWA) with Supabase PostgreSQL cloud sync and **Artha AI**, an embedded financial intelligence assistant.

---

## 📖 Complete Technical & Financial Documentation
All project architecture, financial engine specifications, database migrations, and audit reports are organized in the [`docs/`](./docs) directory:

- 🌟 **[Master Financial Engine & Database Migration Specification](./docs/FINANCIAL_ENGINE_AND_DATABASE_MIGRATION.md)** — **All-in-one consolidated master document** combining the audit, accounting rules, implementation details, automated test report, and full PostgreSQL migration script.
- 🛡️ **[Post-Implementation Verification Report](./docs/POST_IMPLEMENTATION_VERIFICATION_REPORT.md)** — Independent post-implementation audit verifying atomicity, RLS, reconciliation, and edge cases.
- 🔒 **[Database Security Audit](./docs/DATABASE_SECURITY_AUDIT.md)** — RLS multi-tenant policy audit and SECURITY DEFINER search_path hardening.
- ⚛️ **[Database Atomicity Audit](./docs/DATABASE_ATOMICITY_AUDIT.md)** — Verification of ACID transaction boundaries and PostgreSQL RPC functions.
- ⚖️ **[Reconciliation Verification Report](./docs/RECONCILIATION_VERIFICATION_REPORT.md)** — Ledger reconstruction audit, opening balance conventions, and transfer direction fixes.
- 🧪 **[Financial Regression Test Report](./docs/FINANCIAL_REGRESSION_TEST_REPORT.md)** — Full regression test suite execution matrix (20/20 tests passing).
- 📘 **[Project Technical Documentation](./docs/PROJECT_DOCUMENTATION.md)** — In-depth guide covering UI hierarchy, backend, APIs, styling, state management, and PWA setup.
- 📐 **[Financial Accounting Rules](./docs/FINANCIAL_ACCOUNTING_RULES.md)** — Mathematical specifications, sign conventions, and accounting rules.
- 🔍 **[Financial Engine Audit](./docs/FINANCIAL_ENGINE_AUDIT.md)** — Initial audit and verification report across 17 accounting criteria.
- ⚙️ **[Financial Engine Implementation Report](./docs/FINANCIAL_ENGINE_IMPLEMENTATION_REPORT.md)** — Architectural report detailing the centralized calculation library.
- 🗄️ **[Database Migration Report](./docs/DATABASE_MIGRATION_REPORT.md)** — Supabase PostgreSQL schema migration and RLS hardening guide.
- 📋 **[Financial Engine Remaining Issues](./docs/FINANCIAL_ENGINE_REMAINING_ISSUES.md)** — Operational roadmap and future feature recommendations.

---

## 🚀 Key Highlights

* **100% Offline-First PWA**: Log expenses, view accounts, and manage budgets without internet connectivity; changes automatically sync to Supabase when you come back online.
* **Artha AI Financial Assistant**:
  * Natural language transaction logging (*"Spent ₹180 on lunch via UPI"*).
  * Cleo-style **Roast My Spending** 🔥 and **Hype My Savings** 🎉.
  * Instant 1-click confirmation cards.
  * Voice dictation using the Web Speech API.
  * Free Google Gemini 1.5/2.0 Flash integration.
* **Multi-Account Engine**: Track real-time balances across Cash, Bank Accounts, UPI Wallets, and Credit Cards.
* **Category Budgets**: Proactive visual alerts (Green/Amber/Red) with spending thresholds.
* **Interactive Live Calendar**: Day-by-day spending drilldown with green/red activity dots and **`+ Log for day`** support for past/future dates.
* **Recurring Bills & Subscriptions**: Automated next-due-date calculator with 1-click payment logging.
* **Modern Fintech Aesthetics**: High-contrast Dark Mode and clean Light Mode built with Tailwind CSS v4 and glassmorphic cards.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, TypeScript, Vite 8, React Router v7
* **Styling**: Tailwind CSS v4, Lucide React
* **Charts**: Recharts
* **State**: Zustand (Optimistic updates & offline queue)
* **Backend**: Supabase PostgreSQL (Row Level Security enabled)
* **AI**: Google Gemini 1.5 Flash REST API + Local Rule-based NLP Engine
* **PWA**: Vite Plugin PWA & Workbox Service Workers

---

## 🏃 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build
```

---

*Refer to [docs/PROJECT_DOCUMENTATION.md](./docs/PROJECT_DOCUMENTATION.md) for full architectural and code details.*

# 💰 MyMoney — Modern Personal Finance & Artha AI

> A modern, offline-first personal wealth management Progressive Web Application (PWA) with Supabase PostgreSQL cloud sync and **Artha AI**, an embedded financial intelligence assistant.

---

## 📖 Complete Technical Documentation
For full, in-depth documentation covering every single aspect of the application (Architecture, UI Hierarchy, Tailwind v4 Styling, Supabase PostgreSQL Schema, Artha AI Dual-Engine, State Management, APIs, and PWA setup), please see:

👉 **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)**

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

*Refer to [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for full architectural and code details.*

# Tsunade — User Stories

## Epic 1: Financial Data Ingestion

### 1.1 Automated Bank Syncing

As a user, I want to securely connect my external bank accounts via a third-party aggregator
(like Enable Banking), so that my balances and transactions are automatically imported without manual
entry.

**Acceptance criteria**

- User can initiate an OAuth connection via the frontend (React).
- The backend (Express) securely stores the access token.
- A background worker (BullMQ) fetches historical transactions and listens for webhooks for new
  transactions.

### 1.2 Privacy-First Manual Import

As a privacy-conscious user, I want to upload a CSV file of my bank transactions, so that I can
track my finances without linking my live bank account to the application.

**Acceptance criteria**

- User can upload standard CSV formats via the UI.
- The backend parses the CSV and maps columns (Date, Amount, Merchant) to the database schema.

## Epic 2: Transaction Ledger & Rules Engine

### 2.1 Unified Transaction Ledger

As a user, I want to view a unified list of all my transactions across all connected accounts, so
that I have a single source of truth for my spending.

**Acceptance criteria**

- UI displays a paginated or infinitely scrolled table of transactions.
- User can filter by date range, account, category, or amount.

### 2.2 Automated Categorization Rules

As a user, I want to create custom rules (e.g., "If merchant contains 'Netflix', set category to
'Subscriptions'"), so that my recurring expenses are categorized automatically as they are
imported.

**Acceptance criteria**

- User can define keyword-based rules in the settings UI.
- The backend applies these rules immediately to historical data and automatically to all new
  incoming transactions via the background worker.

## Epic 3: Net Worth & Asset Tracking

### 3.1 Manual Asset Tracking

As an investor, I want to manually add non-liquid assets (like real estate or physical gold) and
debts (like a personal loan), so that my net worth calculation reflects my entire financial
picture.

**Acceptance criteria**

- User can create a custom asset/liability with a manual current value.
- User can log manual value adjustments over time.

### 3.2 Automated Market Valuations

As an investor holding stocks and crypto, I want to input my portfolio tickers and quantities, so
that the system automatically updates their current market value.

**Acceptance criteria**

- Backend workers periodically poll third-party market APIs for current pricing.
- Database records daily snapshots of the portfolio's total value based on live data.

## Epic 4: Analytics & Cash Flow

### 4.1 Cash Flow Visualizations

As a user planning a budget, I want to view a monthly breakdown of my total income versus total
expenses, so that I can easily see if I am saving or overspending.

**Acceptance criteria**

- Frontend renders interactive charts (e.g., using Recharts or Chart.js) showing money in vs.
  money out.
- Backend provides an aggregated REST endpoint grouping transaction totals by month and category.

# 🚀 Dashboard-X: Twitter/X Multi-Account Monitor & Analytics

**Dashboard-X** is a premium, high-fidelity SaaS web application designed to monitor performance, aggregate profile metrics, and analyze statistical growth for multiple X (Twitter) accounts from a single centralized dashboard. Manage your portfolio of accounts efficiently without constant logging in and out on your browser.

Focuses purely on **monitoring, audit analytics, and performance intelligence** (no automated posting).

---

## ✨ Key Features
- **All-in-One Analytics Board**: A single high-density dashboard displaying comprehensive metrics (followers, following, posting frequencies, and growth deltas) across all connected accounts.
- **AI Audit & Strategy Hub**: Automated diagnostic engine calculating key performance indicators:
  - **F/F Ratio**: Followers-to-following balance.
  - **Content Efficiency**: Net followers gained per new post made.
  - **Audience Density**: Followers-to-posts proportion.
  - **AI Diagnostics & Actionable Strategy**: Instantly identifies account profiles (*Growth Engine*, *Audience Fatigue*, *Unbalanced Growth*, *Organic Leverage*) and generates specific, actionable optimization strategies.
- **Interactive Multi-Ratio Metrics**: Custom styled charts with modern gradients comparing F/F Ratios, growth-per-post efficiency, and historical followers/posting trajectories side-by-side.
- **AES-256-CBC Session Security**: Encrypted Playwright browser states storing session cookies securely on your server.
- **Dual Connection Flow**: Supports both **Headed Browser Login** (local development) and **Manual Cookie Import** (`auth_token` and `ct0` for headless production servers).

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router with standalone build optimizations)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 & Vanilla CSS (Vercel/Linear dark aesthetics)
- **Database**: PostgreSQL
- **ORM**: Prisma (v5)
- **Session & Scraper Agent**: Playwright
- **Charts**: Recharts
- **State Management**: Zustand
- **Server State**: React Query (TanStack Query v5)
- **Authentication**: NextAuth.js v5 (Auth.js)

---

## ⚡ Quick Start & Installation

Follow these steps to run Dashboard-X on your local machine:

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js** (v20 or higher)
- **PostgreSQL Database** (either locally installed, Neon/Supabase cloud, or running via Docker)

### 2. Start PostgreSQL Database
If you use Docker, run the local database with Compose:
```bash
docker compose up -d
```
*Otherwise, create a standard PostgreSQL database locally or in the cloud (e.g. Supabase) and copy the connection string.*

### 3. Configure Environment Variables
Create a `.env.local` file in the project root (or copy `.env.example`). Populate it with your database and security credentials:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dashboard_x?schema=public"
NEXTAUTH_SECRET="your_nextauth_secret_hash"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="64_character_hexadecimal_string_for_session_encryption"
PLAYWRIGHT_HEADLESS="true"
STORAGE_STATES_DIR="./storage-states"
SYNC_INTERVAL_MINUTES="60"
MAX_ACCOUNTS_PER_USER="10"
```

### 4. Initialize Database Schemas
Instantiate database tables and generate client models:
```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

### 5. Seed Database with Historical Data (Optional)
To instantly visualize charts, audits, and statistics without linking a real X account first, run the seeder:
```bash
npm run db:seed
```
*This seeds a default administrator account with the following credentials:*
- **Email**: `admin@dashboardx.com`
- **Password**: `password123`
- *And generates 3 mock accounts (@akun_a, @akun_b, @akun_c) populated with 30 days of growth history.*

### 6. Start the Web App
Run the local Next.js development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser and sign in using the admin credentials above.

### 7. Run the Background Monitor Worker
To begin automated scraping updates, start the worker process in a separate terminal:
```bash
npm run worker
```
*The worker periodically queries accounts and creates statistical snapshots based on the `SYNC_INTERVAL_MINUTES` setting.*

---

## 🔐 Security & How Connecting Accounts Works
1. **Interactive Connect**: Clicking **"Add Account"** triggers a headed Playwright browser instance locally.
2. **Secure Credentials**: A browser popup navigates to X (`https://x.com/i/flow/login`). You log in manually inside the browser window. The dashboard server never reads, intercepts, or stores your passwords.
3. **Session Capture**: Once a successful login redirect is detected, the server extracts the `storageState` (session cookies and local storage tokens).
4. **AES-256 Encryption**: The session state is encrypted with a highly secure **AES-256-CBC** cipher using your private `ENCRYPTION_KEY` and saved as an encrypted file.
5. **Headless Scraper**: The background worker decrypts these files in memory to instantiate silent headless Playwright agents, safely querying metrics without triggering account locks.
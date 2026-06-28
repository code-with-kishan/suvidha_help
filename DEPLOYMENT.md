# 🚀 Suvidha — Step-by-Step Deployment Guide

This guide covers deploying the **Frontend** on Vercel and the **Backend** manually on Render (without using blueprint files). 

Follow these steps in the exact order shown.

---

## 🗺️ Big Picture — Deployment Order

```
STEP 1 → Push local code to GitHub
STEP 2 → Create PostgreSQL Database on Render (Get DATABASE_URL)
STEP 3 → Create Backend Web Service on Render (Configure all backend env vars)
STEP 4 → Deploy Frontend on Vercel (Set VITE_API_URL to the Render URL)
STEP 5 → Update CORS_ORIGIN on Render (Set it to the Vercel URL)
STEP 6 → Test and verify login works
```

---
---

# STEP 1 — PUSH YOUR CODE TO GITHUB

Both Render and Vercel will deploy by reading your code directly from a GitHub repository.

### 1.1 — Create a GitHub Repository
1. Go to **[https://github.com/new](https://github.com/new)** and log in.
2. Fill in the repository details:
   - **Repository name**: `suvidha`
   - **Visibility**: `Private` (recommended to keep secrets safe)
   - **Initialize this repository**: ❌ Do NOT check any options (no README, no .gitignore).
3. Click **Create repository**.
4. Copy the repository URL (e.g. `https://github.com/YOUR_USERNAME/suvidha.git`).

### 1.2 — Link and Push Local Code
Open your terminal inside the project root directory (`GENERAL/`) and run:

```bash
# Initialize git if you haven't already
git init

# Add all files to staging
git add .

# Commit changes
git commit -m "chore: prepare for deployment"

# Link your local folder to GitHub (Replace YOUR_USERNAME with your real username)
git remote add origin https://github.com/YOUR_USERNAME/suvidha.git

# Rename default branch to main and push
git branch -M main
git push -u origin main
```
*(If prompted for credentials, use your GitHub username and a **Personal Access Token** as the password).*

---
---

# STEP 2 — CREATE POSTGRESQL DATABASE ON RENDER

The backend needs a PostgreSQL database to connect to. We will set this up first so we can copy the connection URL.

### 2.1 — Create Render Account
1. Go to **[https://render.com](https://render.com)**.
2. Click **Get Started for Free** and log in using **GitHub**.

### 2.2 — Create the PostgreSQL DB
1. In the Render Dashboard, click the **New +** button (top right).
2. Select **PostgreSQL**.
3. Fill in the creation form:
   - **Name**: `suvidha-db`
   - **Database**: `suvidha`
   - **User**: `suvidha_user`
   - **Region**: Choose a region closest to your users (e.g., `Singapore` or `Oregon`).
   - **PostgreSQL Version**: `16`
   - **Plan**: `Free`
4. Click **Create Database** at the bottom.

### 2.3 — Copy Database URL
1. Wait 1–2 minutes for the database status to change to **Available** (green dot).
2. Scroll down to the **Connections** section.
3. Locate **Internal Database URL** and copy it to a temporary notepad. It will look like this:
   ```
   postgresql://suvidha_user:AbCdEf123456@dpg-abc123xyz.singapore-postgres.render.com/suvidha
   ```

---
---

# STEP 3 — CREATE THE BACKEND WEB SERVICE ON RENDER

Now we will create the web service that runs the Node.js Express server.

### 3.1 — Create Web Service
1. Click **New +** (top right) in Render dashboard.
2. Select **Web Service**.
3. Under "Connect a repository", click **Connect** next to your `suvidha` repository.

### 3.2 — Configure Web Service Form
Set the fields exactly as follows:

| Field Name | Value to Enter |
|------------|----------------|
| **Name** | `suvidha-backend` |
| **Region** | *Same region as you chose for the database* |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate` |
| **Start Command** | `npx prisma db push --accept-data-loss && npm run seed:admin && npm start` |
| **Plan** | `Free` |

### 3.3 — Add Environment Variables
Scroll down to the **Environment Variables** section and click **Add Environment Variable** for each line:

1. **`DATABASE_URL`**: Paste the **Internal Database URL** copied in Step 2.3.
2. **`JWT_SECRET`**: Paste a random string of 32 characters (e.g. generate by running `openssl rand -hex 32` in terminal).
3. **`HMAC_SECRET`**: Paste another distinct 32-character random string.
4. **`PORT`**: `5000`
5. **`NODE_ENV`**: `production`
6. **`JWT_EXPIRES_IN`**: `7d`
7. **`KIOSK_DEVICE_KEYS`**: `kiosk-01:change-me`
8. **`APP_BASE_URL`**: *Leave empty for now* (we will update this in Step 3.5).
9. **`CORS_ORIGIN`**: *Leave empty for now* (we will update this in Step 5).

#### 👤 Custom Admin Seeding Variables (Optional)
If you want custom credentials for your first admin, add these:
- **`DEFAULT_ADMIN_MOBILE`**: your mobile number (default is `9999999999`)
- **`DEFAULT_ADMIN_PASSWORD`**: strong password (default is `Admin@123`)

### 3.4 — Trigger Deployment & Monitor
1. Click **Create Web Service**.
2. Go to the **Logs** tab and wait ~3–5 minutes.
3. You should see:
   ```
   ✓ Your database is now in sync with your Prisma schema
   ✓ Admin user seeded successfully.
   ✓ Server running on port 5000
   ```

### 3.5 — Copy Backend URL & Set APP_BASE_URL
1. At the top of your web service page, copy the public URL (e.g., `https://suvidha-backend.onrender.com`).
2. Go to the **Environment** tab of the web service.
3. Edit the **`APP_BASE_URL`** value and paste your backend URL.
4. Click **Save Changes**. The service will redeploy.

---
---

# STEP 4 — DEPLOY FRONTEND ON VERCEL

### 4.1 — Create Vercel Account
1. Go to **[https://vercel.com](https://vercel.com)**.
2. Sign up and log in using your **GitHub** account.

### 4.2 — Import Repository
1. In the Vercel Dashboard, click **Add New…** → **Project**.
2. Find your `suvidha` repository and click **Import**.

### 4.3 — Configure Build & Development Settings
Set the configuration as follows:
- **Framework Preset**: `Vite`
- **Root Directory**: `.` (leave as repository root, do not change to `client/`)
- **Build Command**: `npm run build --prefix client`
- **Output Directory**: `client/dist`
- **Install Command**: `npm install --prefix client`

### 4.4 — Add Environment Variables
Add these variables in the **Environment Variables** section:

| Name | Value |
|------|-------|
| **`VITE_API_URL`** | `https://suvidha-backend.onrender.com` *(your Render backend URL; no trailing slash)* |
| **`VITE_KIOSK_ID`** | `kiosk-01` |
| **`VITE_KIOSK_KEY`** | `change-me` |
| **`VITE_APP_VERSION`** | `1.0.0` |
### 4.5 — Deploy
1. Click **Deploy**.
2. Wait 1–2 minutes for the build to finish.
3. Copy your live Vercel URL (e.g., `https://suvidha-xyz.vercel.app`).

---
---

# STEP 5 — CONNECT FRONTEND AND BACKEND (CORS)

To allow the frontend website to make requests to your backend without security blocks, configure CORS.

1. Go back to your **Render Dashboard** → click your **`suvidha-backend`** Web Service.
2. Click on the **Environment** tab.
3. Edit **`CORS_ORIGIN`** and paste your Vercel URL:
   ```
   https://suvidha-xyz.vercel.app
   ```
   *(To allow local development alongside production, use comma-separated values: `https://suvidha-xyz.vercel.app,http://localhost:5173`)*
4. Click **Save Changes**.

---
---

# STEP 6 — TEST YOUR APP

1. Open your Vercel URL in the browser: `https://suvidha-xyz.xyz.vercel.app`
2. Enter your administrator mobile number and password to log in:
   - **Mobile**: `9999999999` (or the one you set in `DEFAULT_ADMIN_MOBILE`)
   - **Password**: `Admin@123` (or the one you set in `DEFAULT_ADMIN_PASSWORD`)
3. Open browser DevTools (right-click -> **Inspect** -> **Network** tab) to verify API requests are sending successfully to your Render backend.

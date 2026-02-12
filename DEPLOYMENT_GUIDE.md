# Deployment Guide - Crypto Regulatory Tracker

Complete guide for deploying both the **web dashboard** (static site) and the **automation pipeline** (scheduled jobs).

---

## Table of Contents

1. [Dashboard Deployment](#dashboard-deployment) (Vercel, Netlify, GitHub Pages)
2. [Pipeline Deployment](#pipeline-deployment) (Railway, Render, Cron)
3. [Database Setup](#database-setup) (Supabase)
4. [Environment Variables](#environment-variables)
5. [Production Checklist](#production-checklist)

---

## Dashboard Deployment

The web dashboard (`public/` folder) is a **static site** — pure HTML/CSS/JS with no build step required.

### Option 1: Vercel (Recommended)

#### Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd public/
vercel --prod

# Follow prompts:
# - Project name: crypto-regulatory-tracker
# - Build command: (leave empty)
# - Output directory: .
# - Dev command: (leave empty)
```

#### Via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Import from GitHub: `appydam/crypto-regulatory-tracker`
4. **Framework Preset:** Other
5. **Root Directory:** `public`
6. **Build Command:** (leave empty)
7. **Output Directory:** `.`
8. Click **"Deploy"**

**Live URL:** `https://crypto-regulatory-tracker.vercel.app`

---

### Option 2: Netlify

#### Via Netlify CLI

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
cd public/
netlify deploy --prod

# Follow prompts:
# - Publish directory: .
# - Site name: crypto-regulatory-tracker
```

#### Via Netlify Dashboard

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect to GitHub and select `appydam/crypto-regulatory-tracker`
4. **Base directory:** `public`
5. **Build command:** (leave empty)
6. **Publish directory:** `public`
7. Click **"Deploy site"**

**Live URL:** `https://crypto-regulatory-tracker.netlify.app`

---

### Option 3: GitHub Pages

#### Via Repository Settings

1. Go to repo: https://github.com/appydam/crypto-regulatory-tracker
2. Click **Settings** → **Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` / Folder: `/public`
5. Click **"Save"**

GitHub Actions workflow is already configured (`.github/workflows/deploy.yml`).

**Live URL:** `https://appydam.github.io/crypto-regulatory-tracker/`

#### Via GitHub Actions (Auto-Deploy)

Workflow triggers on every push to `main` branch. See `.github/workflows/deploy.yml`:

```yaml
name: Deploy Dashboard to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './public'
      - uses: actions/deploy-pages@v4
```

---

## Pipeline Deployment

The automation pipeline (scraping, classification, reporting) runs as **scheduled jobs**.

### Option 1: Railway (Easiest)

#### Step 1: Install Railway CLI

```bash
npm i -g @railway/cli
railway login
```

#### Step 2: Initialize Project

```bash
# From repo root
railway init

# Select:
# - Create new project: crypto-regulatory-tracker
# - Environment: production
```

#### Step 3: Configure Environment Variables

```bash
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_ANON_KEY="your-anon-key"
railway variables set ANTHROPIC_API_KEY="sk-ant-..."
railway variables set RESEND_API_KEY="re_..."
railway variables set FROM_EMAIL="compliance@yourcompany.com"
```

#### Step 4: Deploy

```bash
railway up
```

#### Step 5: Add Cron Job

In Railway dashboard:
1. Go to your service
2. Click **"Cron"** tab
3. Add schedule:
   - **Name:** Scrape Regulators
   - **Command:** `npm run scrape`
   - **Schedule:** `0 */6 * * *` (every 6 hours)
4. Save

**Cost:** ~$5/month (Hobby plan)

---

### Option 2: Render

#### Step 1: Create Cron Job

1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Cron Job"**
3. Connect GitHub repo: `appydam/crypto-regulatory-tracker`
4. **Name:** crypto-tracker-scraper
5. **Environment:** Node
6. **Build Command:** `npm install`
7. **Command:** `npm run scrape`
8. **Schedule:** `0 */6 * * *` (every 6 hours)

#### Step 2: Add Environment Variables

In the Render dashboard (Environment section):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
FROM_EMAIL=compliance@yourcompany.com
```

#### Step 3: Deploy

Click **"Create Cron Job"**. Render will:
- Pull the repo
- Install dependencies
- Run the scraper on schedule

**Cost:** Free tier available (limited to 750 hours/month)

---

### Option 3: VPS with Cron (Advanced)

For full control, deploy to a VPS (DigitalOcean, Linode, AWS EC2).

#### Step 1: SSH into Server

```bash
ssh user@your-server-ip
```

#### Step 2: Install Dependencies

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2
```

#### Step 3: Clone & Setup

```bash
git clone https://github.com/appydam/crypto-regulatory-tracker.git
cd crypto-regulatory-tracker
npm install

# Configure environment
cp .env.example .env
nano .env  # Add your credentials
```

#### Step 4: Add Cron Job

```bash
crontab -e
```

Add:

```cron
# Scrape every 6 hours
0 */6 * * * cd /path/to/crypto-regulatory-tracker && npm run scrape >> /var/log/crypto-tracker.log 2>&1

# Generate report Friday 6pm
0 18 * * 5 cd /path/to/crypto-regulatory-tracker && npm run dev report

# Send report Saturday 9am
0 9 * * 6 cd /path/to/crypto-regulatory-tracker && npm run dev send
```

#### Step 5: Test

```bash
# Manual run
cd /path/to/crypto-regulatory-tracker
npm run scrape
```

**Cost:** $5-10/month (VPS hosting)

---

## Database Setup

### Supabase (Recommended)

#### Step 1: Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. **Organization:** Create new or select existing
4. **Name:** crypto-regulatory-tracker
5. **Database Password:** (generate strong password)
6. **Region:** Choose closest to your users
7. Click **"Create new project"**

#### Step 2: Run Schema

1. Go to **"SQL Editor"** in Supabase dashboard
2. Copy contents of `sql/schema.sql`
3. Paste and run

Schema creates:
- `regulatory_events` table (stores scraped events)
- `subscribers` table (email list)
- Indexes for performance

#### Step 3: Get Credentials

1. Go to **"Project Settings"** → **"API"**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
3. Add to `.env` or Railway/Render environment variables

**Cost:** Free tier (500MB database, 2GB bandwidth)

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `ANTHROPIC_API_KEY` | Claude API key for classification | `sk-ant-api03-...` |
| `RESEND_API_KEY` | Resend API key for email | `re_123abc...` |
| `FROM_EMAIL` | Sender email address | `compliance@yourcompany.com` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_BROWSER` | Force Puppeteer for all scrapers | `false` |
| `NODE_ENV` | Environment mode | `production` |

---

## Production Checklist

### Before Deployment

- [ ] All environment variables configured
- [ ] Supabase schema deployed
- [ ] Test scraper locally: `npm run scrape`
- [ ] Test classification locally: `npm run dev classify`
- [ ] Verify data in Supabase database
- [ ] Test dashboard locally: `npm run demo`

### Dashboard Deployment

- [ ] Choose platform (Vercel/Netlify/GitHub Pages)
- [ ] Deploy static site from `public/` folder
- [ ] Verify charts load correctly
- [ ] Test filtering and responsive design
- [ ] Add custom domain (optional)

### Pipeline Deployment

- [ ] Choose platform (Railway/Render/VPS)
- [ ] Set up cron schedule (every 6 hours recommended)
- [ ] Configure email delivery (Resend)
- [ ] Test scraper runs successfully
- [ ] Verify events appear in dashboard
- [ ] Set up monitoring/alerts (optional)

### Post-Deployment

- [ ] Test end-to-end flow (scrape → classify → dashboard update)
- [ ] Monitor first 24 hours for errors
- [ ] Check Supabase usage metrics
- [ ] Verify email reports send successfully
- [ ] Add uptime monitoring (e.g., UptimeRobot)

---

## Troubleshooting

### Dashboard doesn't load

**Check:**
- Ensure `public/index.html` and `public/sample-data.json` are deployed
- Verify static site hosting is serving from correct directory
- Check browser console for JavaScript errors

**Fix:**
```bash
# Test locally first
cd public/
npx http-server -p 8080
```

### Scraper fails

**Check:**
- Environment variables are set correctly
- Supabase credentials are valid
- Network connectivity to regulator sites
- Rate limiting or IP blocking

**Fix:**
```bash
# Test each scraper individually
npm run scrape:sec
npm run scrape:esma
npm run scrape:mas
npm run scrape:jfsa
npm run scrape:vara
```

### Classification fails

**Check:**
- `ANTHROPIC_API_KEY` is valid
- API quota not exceeded
- Events exist in database

**Fix:**
```bash
# Test classification
npm run dev classify
```

### Email delivery fails

**Check:**
- `RESEND_API_KEY` is valid
- `FROM_EMAIL` domain is verified in Resend
- Email quota not exceeded

**Fix:**
```bash
# Test email send
npm run dev send your@email.com
```

---

## Cost Summary

### Minimum Cost (All Free Tiers)

| Service | Plan | Cost |
|---------|------|------|
| **Dashboard** | GitHub Pages | $0 |
| **Database** | Supabase Free | $0 |
| **Pipeline** | Render Free | $0 |
| **Email** | Resend Free (100/day) | $0 |
| **AI** | Anthropic Pay-as-you-go | ~$2-5/mo |

**Total:** ~$2-5/month (only for AI classification)

### Recommended Production Setup

| Service | Plan | Cost |
|---------|------|------|
| **Dashboard** | Vercel Pro | $20/mo |
| **Database** | Supabase Pro | $25/mo |
| **Pipeline** | Railway Hobby | $5/mo |
| **Email** | Resend Pro (50k/mo) | $20/mo |
| **AI** | Anthropic (higher volume) | ~$10-20/mo |

**Total:** ~$80-90/month (production-ready)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/appydam/crypto-regulatory-tracker/issues)
- **Email:** [arpit@example.com](mailto:arpit@example.com)
- **Demo Script:** See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for Loom recording guide

---

Built by Forge 🔨 for production deployment.

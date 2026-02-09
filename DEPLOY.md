# 🚀 Deployment Guide — Crypto Regulatory Tracker

Get running in **< 10 minutes**.

---

## Quick Start

```bash
# Clone and setup
git clone https://github.com/appydam/crypto-regulatory-tracker.git
cd crypto-regulatory-tracker
bash setup.sh
```

The setup wizard will:
1. ✅ Check Node.js is installed
2. ✅ Prompt for credentials
3. ✅ Test all connections
4. ✅ Write your `.env` file
5. ✅ Install dependencies
6. ✅ Build the project

---

## 📋 Credentials Checklist

| Service | Required? | Free Tier | Purpose |
|---------|-----------|-----------|---------|
| Supabase | ✅ Yes | 500MB DB, 2 projects | Database |
| Anthropic | ✅ Yes | $5 free credits | LLM classification |
| Resend | ⚠️ Optional | 3,000 emails/mo | Email delivery |

---

## 1. Supabase Setup (Database)

**Time:** 3 minutes

1. Go to [supabase.com](https://supabase.com) → **Start your project**
2. Sign up (GitHub recommended)
3. Create a new project:
   - Name: `crypto-tracker`
   - Region: Choose closest to you
   - Password: Save this!
4. Wait for project to spin up (~1 min)
5. Go to **Settings** → **API** (left sidebar)
6. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### Run Database Migrations

After setup:
1. Go to **SQL Editor** in Supabase dashboard
2. Click **+ New query**
3. Copy contents of `sql/schema.sql` from this repo
4. Click **Run** (or Cmd+Enter)

✅ You should see: "Success. No rows returned"

---

## 2. Anthropic Setup (LLM)

**Time:** 2 minutes

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up / Log in
3. Go to **Settings** → **API Keys**
4. Click **Create Key**
   - Name: `crypto-tracker`
5. Copy the key → `ANTHROPIC_API_KEY`
   - ⚠️ Starts with `sk-ant-`
   - ⚠️ Only shown once!

**Note:** New accounts get $5 free credits. Claude Haiku costs ~$0.25/1M input tokens.

---

## 3. Resend Setup (Email) — Optional

**Time:** 3 minutes

Skip this if you just want to test scraping locally.

1. Go to [resend.com](https://resend.com) → **Get Started**
2. Sign up
3. Go to **API Keys** → **Create API Key**
   - Name: `crypto-tracker`
   - Permission: `Full access`
4. Copy the key → `RESEND_API_KEY`
   - Starts with `re_`

### Domain Setup (for production)

For sending from your own domain:
1. Go to **Domains** → **Add Domain**
2. Add DNS records as instructed
3. Update `FROM_EMAIL` in `.env`

For testing, Resend allows sending from `onboarding@resend.dev`.

---

## 🧪 Testing

### Test Scrapers

```bash
# Scrape all sources
npm run scrape

# Scrape specific source
npm run scrape:sec
npm run scrape:esma
npm run scrape:mas
npm run scrape:jfsa
npm run scrape:vara

# Use browser scrapers (for JS-rendered pages)
USE_BROWSER=true npm run scrape
```

### Test Classification

```bash
# Requires ANTHROPIC_API_KEY
npm run classify
```

### Test Report Generation

```bash
npm run report
```

### Run Full Pipeline

```bash
npm run pipeline
```

---

## ⏰ Scheduling (Cron)

### Option 1: System Cron (Linux/Mac)

```bash
crontab -e
```

Add:
```cron
# Scrape every 6 hours
0 */6 * * * cd /path/to/crypto-regulatory-tracker && npm run scrape >> /var/log/crypto-scrape.log 2>&1

# Generate weekly report Friday 6pm UTC
0 18 * * 5 cd /path/to/crypto-regulatory-tracker && npm run report >> /var/log/crypto-report.log 2>&1

# Send report Saturday 9am UTC
0 9 * * 6 cd /path/to/crypto-regulatory-tracker && npm run send >> /var/log/crypto-send.log 2>&1
```

### Option 2: Railway/Render Cron Jobs

If deployed to Railway or Render, use their built-in cron:
- Railway: Add `railway.toml` with cron config
- Render: Use Cron Jobs feature in dashboard

### Option 3: GitHub Actions

Create `.github/workflows/scrape.yml`:

```yaml
name: Scrape Regulatory Updates
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run scrape
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## 🔧 Troubleshooting

### "SUPABASE_URL is not defined"

Your `.env` file is missing or not loaded.

```bash
# Check .env exists
cat .env

# Re-run setup
bash setup.sh
```

### "Invalid API key" (Anthropic)

- Check key starts with `sk-ant-`
- Regenerate key in Anthropic console
- Check for trailing spaces in `.env`

### Scraper returns 0 items

Some sources use JavaScript rendering. Try:

```bash
USE_BROWSER=true npm run scrape
```

Requires Puppeteer to be installed (included in dependencies).

### "403 Forbidden" on SEC Litigation

The SEC litigation page requires browser headers. Use:

```bash
npm run scrape:sec
# Not: scrape:sec-litigation (deprecated)
```

### Email not sending

1. Check `RESEND_API_KEY` is set
2. Verify domain in Resend dashboard
3. Check spam folder
4. For testing, use `onboarding@resend.dev` as FROM_EMAIL

### Database connection failed

1. Check Supabase project is not paused (free tier pauses after 1 week inactivity)
2. Verify URL has no trailing slash
3. Check anon key is the "anon public" one (not service_role)

---

## 📁 Project Structure

```
crypto-regulatory-tracker/
├── setup.sh           # One-click setup wizard
├── .env               # Your credentials (gitignored)
├── .env.example       # Template
├── sql/
│   └── schema.sql     # Database schema
├── src/
│   ├── index.ts       # CLI entry point
│   ├── scrape.ts      # Scraper orchestration
│   ├── classify.ts    # LLM classification
│   ├── report.ts      # Report generation
│   ├── send.ts        # Email delivery
│   └── scrapers/      # Individual source scrapers
├── package.json
└── README.md
```

---

## 💰 Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Supabase (Pro) | $25 |
| Anthropic (Haiku) | ~$2 |
| Resend | $0-20 |
| **Total** | **~$30-50/mo** |

Free tiers work for MVP/testing.

---

## 🆘 Still Stuck?

1. Check the [README.md](./README.md) for command reference
2. Open an issue on GitHub
3. Ask @Forge in Mission Control

---

*Last updated: Feb 2026*

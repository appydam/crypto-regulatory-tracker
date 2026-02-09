# Crypto Regulatory Tracker

Automated weekly crypto regulatory intelligence pipeline for compliance teams.

## Features

- **5 Jurisdiction Coverage**: SEC (US), ESMA (EU), MAS (Singapore), JFSA (Japan), VARA (Dubai)
- **Smart Filtering**: Keyword + LLM classification to identify crypto-related updates
- **Impact Rating**: High/Medium/Low impact assessment via Claude Haiku
- **Weekly Reports**: Auto-generated newsletter-style digest
- **Email Delivery**: Resend integration for subscriber management

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your credentials

# Run scraper (works without credentials - outputs to console)
npm run scrape

# Run full pipeline
npm run dev pipeline
```

## Commands

```bash
npm run scrape        # Fetch from all sources
npm run dev scrape    # Same as above
npm run dev classify  # LLM classification (needs ANTHROPIC_API_KEY)
npm run dev report    # Generate weekly report
npm run dev send <email>  # Send test email
npm run dev pipeline  # Full pipeline: scrape → classify → report
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | For persistence |
| `SUPABASE_ANON_KEY` | Supabase anon key | For persistence |
| `ANTHROPIC_API_KEY` | Claude API key | For LLM classification |
| `RESEND_API_KEY` | Resend API key | For email delivery |
| `FROM_EMAIL` | Sender email address | For email delivery |

## Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the schema in `sql/schema.sql` via SQL Editor
3. Copy project URL and anon key to `.env`

## Data Sources

| Source | Method | Status | Notes |
|--------|--------|--------|-------|
| SEC (US) | RSS | ✅ Working | Press releases work, Litigation blocked |
| ESMA (EU) | RSS + HTML | ✅ Working | RSS blocked, HTML fallback works |
| MAS (Singapore) | RSS + HTML | ⚠️ Limited | JS-rendered, needs browser scraping |
| JFSA (Japan) | HTML scrape | ✅ Working | Low volume, keyword filtering |
| VARA (Dubai) | HTML scrape | ⚠️ Limited | JS-rendered, needs browser scraping |

**Note:** MAS and VARA sites are JavaScript-rendered. Full support requires Puppeteer/Playwright integration. See `DEPLOYMENT.md` for details.

## Pipeline Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Scrape    │ ──► │  Classify   │ ──► │   Report    │ ──► │    Send     │
│  (5 sources)│     │ (Claude AI) │     │  (Markdown) │     │  (Resend)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## Project Structure

```
crypto-regulatory-tracker/
├── src/
│   ├── scrapers/
│   │   ├── sec.ts      # SEC RSS scraper
│   │   ├── esma.ts     # ESMA RSS scraper
│   │   ├── mas.ts      # MAS RSS scraper
│   │   ├── jfsa.ts     # JFSA HTML scraper
│   │   ├── vara.ts     # VARA HTML scraper
│   │   └── index.ts    # Scraper orchestrator
│   ├── classify.ts     # LLM classification
│   ├── report.ts       # Report generator
│   ├── send.ts         # Email delivery
│   ├── db.ts           # Supabase client
│   ├── config.ts       # Configuration
│   ├── types.ts        # TypeScript types
│   ├── scrape.ts       # Scrape runner
│   └── index.ts        # Main CLI
├── sql/
│   └── schema.sql      # Database schema
├── .env.example
├── package.json
└── README.md
```

## Scheduling (Production)

For production, set up cron jobs:

```bash
# Scrape every 6 hours
0 */6 * * * cd /path/to/project && npm run scrape

# Generate report Friday 6pm
0 18 * * 5 cd /path/to/project && npm run dev report

# Send Saturday 9am
0 9 * * 6 cd /path/to/project && npm run dev send
```

Or use Railway/Render scheduled jobs.

## License

MIT

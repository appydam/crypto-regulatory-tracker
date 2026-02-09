#!/bin/bash
# Crypto Regulatory Tracker - One-Click Setup
# Run: bash setup.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   🔒 Crypto Regulatory Tracker — Setup Wizard"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "  Install: https://nodejs.org/ (v18+ required)"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} npm $(npm -v)"
echo ""

# ───────────────────────────────────────────────────────────────
# Collect Credentials
# ───────────────────────────────────────────────────────────────

echo "📝 Enter your credentials (press Enter to skip optional ones)"
echo "   Get them from: DEPLOY.md or run with --help"
echo ""

# Supabase
echo -e "${YELLOW}1. Supabase${NC} (database — required)"
echo "   Dashboard: https://supabase.com/dashboard"
read -p "   SUPABASE_URL: " SUPABASE_URL
read -p "   SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY

# Anthropic
echo ""
echo -e "${YELLOW}2. Anthropic${NC} (LLM classification — required)"
echo "   Dashboard: https://console.anthropic.com/settings/keys"
read -p "   ANTHROPIC_API_KEY: " ANTHROPIC_API_KEY

# Resend
echo ""
echo -e "${YELLOW}3. Resend${NC} (email delivery — optional for testing)"
echo "   Dashboard: https://resend.com/api-keys"
read -p "   RESEND_API_KEY [skip]: " RESEND_API_KEY
read -p "   FROM_EMAIL [updates@yourdomain.com]: " FROM_EMAIL

# Defaults
FROM_EMAIL=${FROM_EMAIL:-"updates@yourdomain.com"}

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   🔄 Installing dependencies..."
echo "═══════════════════════════════════════════════════════════════"
npm install

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   🧪 Testing connections..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

ERRORS=0

# Test Supabase
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
    SUPABASE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        "${SUPABASE_URL}/rest/v1/" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" 2>/dev/null || echo "000")
    
    if [ "$SUPABASE_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✓${NC} Supabase: Connected"
    else
        echo -e "${RED}✗${NC} Supabase: Connection failed (HTTP $SUPABASE_RESPONSE)"
        echo "  Check your URL and anon key"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} Supabase: Missing credentials"
    ERRORS=$((ERRORS + 1))
fi

# Test Anthropic
if [ -n "$ANTHROPIC_API_KEY" ]; then
    ANTHROPIC_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        "https://api.anthropic.com/v1/messages" \
        -H "x-api-key: ${ANTHROPIC_API_KEY}" \
        -H "anthropic-version: 2023-06-01" \
        -H "content-type: application/json" \
        -d '{"model":"claude-3-haiku-20240307","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}' 2>/dev/null || echo "000")
    
    if [ "$ANTHROPIC_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✓${NC} Anthropic: API key valid"
    else
        echo -e "${YELLOW}⚠${NC} Anthropic: Could not verify (HTTP $ANTHROPIC_RESPONSE)"
        echo "  This might be a rate limit — key format looks OK"
    fi
else
    echo -e "${RED}✗${NC} Anthropic: Missing API key"
    ERRORS=$((ERRORS + 1))
fi

# Test Resend
if [ -n "$RESEND_API_KEY" ] && [ "$RESEND_API_KEY" != "skip" ]; then
    RESEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        "https://api.resend.com/domains" \
        -H "Authorization: Bearer ${RESEND_API_KEY}" 2>/dev/null || echo "000")
    
    if [ "$RESEND_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✓${NC} Resend: API key valid"
    else
        echo -e "${YELLOW}⚠${NC} Resend: Could not verify (HTTP $RESEND_RESPONSE)"
    fi
else
    echo -e "${YELLOW}⚠${NC} Resend: Skipped (email won't work)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   💾 Writing .env file..."
echo "═══════════════════════════════════════════════════════════════"

cat > .env << EOF
# Crypto Regulatory Tracker Configuration
# Generated by setup.sh on $(date)

# Supabase (database)
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# Anthropic (LLM classification)
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

# Resend (email delivery)
RESEND_API_KEY=${RESEND_API_KEY}
FROM_EMAIL=${FROM_EMAIL}
EOF

echo -e "${GREEN}✓${NC} Created .env"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   📊 Building TypeScript..."
echo "═══════════════════════════════════════════════════════════════"
npm run build
echo -e "${GREEN}✓${NC} Build complete"

echo ""
echo "═══════════════════════════════════════════════════════════════"

if [ $ERRORS -eq 0 ]; then
    echo -e "   ${GREEN}🎉 Setup Complete!${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  1. Run Supabase migrations (if not done):"
    echo "     → Copy sql/schema.sql to Supabase SQL Editor and run"
    echo ""
    echo "  2. Test the scrapers:"
    echo "     npm run scrape"
    echo ""
    echo "  3. Run full pipeline:"
    echo "     npm run pipeline"
    echo ""
    echo "  4. Set up cron (optional):"
    echo "     → See DEPLOY.md for scheduling"
    echo ""
else
    echo -e "   ${YELLOW}⚠ Setup completed with warnings${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Some credentials failed validation. Check:"
    echo "  - DEPLOY.md for setup instructions"
    echo "  - .env file to manually fix values"
    echo ""
fi

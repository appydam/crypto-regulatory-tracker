/**
 * ESMA Scraper (EU - MiCA)
 * Source: https://www.esma.europa.eu/press-news/esma-news
 *
 * Primary: RSS feed
 * Fallback: HTML scraping (RSS may be geo-blocked)
 */
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
const parser = new Parser({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoRegulatoryTracker/1.0)',
    },
});
const ESMA_FEED = 'https://www.esma.europa.eu/press-news/esma-news/feed';
const ESMA_NEWS_URL = 'https://www.esma.europa.eu/press-news/esma-news';
const CRYPTO_KEYWORDS = [
    'crypto', 'digital asset', 'mica', 'dlt', 'blockchain',
    'stablecoin', 'defi', 'virtual asset', 'distributed ledger',
    'cryptocurrency', 'token', 'dora',
];
function isPotentiallyCrypto(text) {
    const lower = text.toLowerCase();
    return CRYPTO_KEYWORDS.some(kw => lower.includes(kw));
}
function hashContent(title, url) {
    return crypto.createHash('sha256').update(`${title}|${url}`).digest('hex');
}
async function tryRSS() {
    const items = [];
    try {
        console.log('[ESMA] Trying RSS feed...');
        const result = await parser.parseURL(ESMA_FEED);
        for (const entry of result.items) {
            if (!entry.title || !entry.link)
                continue;
            const update = {
                source: 'ESMA',
                title: entry.title.trim(),
                summary: entry.contentSnippet?.slice(0, 500),
                source_url: entry.link,
                published_at: entry.pubDate ? new Date(entry.pubDate) : undefined,
                scraped_at: new Date(),
                content_hash: hashContent(entry.title, entry.link),
                is_crypto_related: isPotentiallyCrypto(entry.title + ' ' + (entry.contentSnippet || '')),
            };
            items.push(update);
        }
        console.log(`[ESMA] RSS: ${items.length} items`);
    }
    catch (err) {
        console.log(`[ESMA] RSS failed: ${err instanceof Error ? err.message : err}`);
    }
    return items;
}
async function fallbackHTML() {
    const items = [];
    try {
        console.log('[ESMA] Trying HTML fallback...');
        const response = await fetch(ESMA_NEWS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        // Try various selector patterns for ESMA news structure
        $('[class*="news"], [class*="article"], article, .view-content .views-row, .node').each((_, el) => {
            const $el = $(el);
            const $link = $el.find('a[href*="/news/"], a[href*="/press-news/"]').first();
            let href = $link.attr('href');
            const title = $link.text().trim() || $el.find('h2, h3, h4, .title, .field-title').text().trim();
            if (!title || !href)
                return;
            // Make absolute URL
            if (href.startsWith('/')) {
                href = `https://www.esma.europa.eu${href}`;
            }
            // Try to find date
            const dateText = $el.find('.date, time, .field-date, [class*="date"]').text().trim();
            let publishedAt;
            if (dateText) {
                const parsed = new Date(dateText);
                if (!isNaN(parsed.getTime()))
                    publishedAt = parsed;
            }
            const summary = $el.find('p, .field-body, .excerpt').first().text().trim().slice(0, 500);
            const update = {
                source: 'ESMA',
                title: title.slice(0, 500),
                summary: summary || undefined,
                source_url: href,
                published_at: publishedAt,
                scraped_at: new Date(),
                content_hash: hashContent(title, href),
                is_crypto_related: isPotentiallyCrypto(title + ' ' + (summary || '')),
            };
            items.push(update);
        });
        console.log(`[ESMA] HTML fallback: ${items.length} items`);
    }
    catch (err) {
        console.log(`[ESMA] HTML fallback failed: ${err instanceof Error ? err.message : err}`);
    }
    return items;
}
export async function scrapeESMA() {
    const errors = [];
    // Try RSS first
    let items = await tryRSS();
    // If RSS fails, try HTML
    if (items.length === 0) {
        items = await fallbackHTML();
        if (items.length === 0) {
            errors.push('Both RSS and HTML scraping failed for ESMA');
        }
    }
    // Filter to crypto-related
    const cryptoItems = items.filter(i => i.is_crypto_related);
    console.log(`[ESMA] ${cryptoItems.length}/${items.length} items are crypto-related`);
    // Dedupe
    const seen = new Set();
    const deduped = cryptoItems.filter(item => {
        if (seen.has(item.content_hash))
            return false;
        seen.add(item.content_hash);
        return true;
    });
    return { source: 'ESMA', items: deduped, errors };
}
if (import.meta.url === `file://${process.argv[1]}`) {
    scrapeESMA().then(r => console.log(JSON.stringify(r, null, 2)));
}

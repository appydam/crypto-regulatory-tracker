/**
 * MAS Scraper (Singapore)
 * Source: https://www.mas.gov.sg/news
 *
 * Primary: RSS feeds (if available)
 * Fallback: HTML scraping from news page
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
const MAS_NEWS_URL = 'https://www.mas.gov.sg/news';
const MAS_RSS_FEEDS = [
    { url: 'https://www.mas.gov.sg/rss/news', name: 'News' },
    { url: 'https://www.mas.gov.sg/rss/media-releases', name: 'Media Releases' },
];
const CRYPTO_KEYWORDS = [
    'crypto', 'digital asset', 'digital payment token', 'dpt', 'blockchain',
    'stablecoin', 'defi', 'virtual asset', 'payment token',
    'cryptocurrency', 'digital currency',
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
    for (const feed of MAS_RSS_FEEDS) {
        try {
            console.log(`[MAS] Trying RSS: ${feed.name}...`);
            const result = await parser.parseURL(feed.url);
            for (const entry of result.items) {
                if (!entry.title || !entry.link)
                    continue;
                const update = {
                    source: 'MAS',
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
            console.log(`[MAS] RSS ${feed.name}: ${result.items.length} items`);
        }
        catch (err) {
            console.log(`[MAS] RSS ${feed.name} failed: ${err instanceof Error ? err.message : err}`);
        }
    }
    return items;
}
async function fallbackHTML() {
    const items = [];
    try {
        console.log('[MAS] Trying HTML fallback...');
        const response = await fetch(MAS_NEWS_URL, {
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
        // Try various selector patterns for MAS news structure
        $('[class*="news"], [class*="article"], [class*="media"], article, .card').each((_, el) => {
            const $el = $(el);
            const $link = $el.find('a[href*="/news/"]').first();
            let href = $link.attr('href');
            const title = $link.text().trim() || $el.find('h2, h3, h4, .title').text().trim();
            if (!title || !href)
                return;
            // Make absolute URL
            if (href.startsWith('/')) {
                href = `https://www.mas.gov.sg${href}`;
            }
            // Try to find date
            const dateText = $el.find('.date, time, [class*="date"]').text().trim();
            let publishedAt;
            if (dateText) {
                const parsed = new Date(dateText);
                if (!isNaN(parsed.getTime()))
                    publishedAt = parsed;
            }
            const summary = $el.find('p, .excerpt').first().text().trim().slice(0, 500);
            const update = {
                source: 'MAS',
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
        console.log(`[MAS] HTML fallback: ${items.length} items`);
    }
    catch (err) {
        console.log(`[MAS] HTML fallback failed: ${err instanceof Error ? err.message : err}`);
    }
    return items;
}
export async function scrapeMAS() {
    const errors = [];
    // Try RSS first
    let items = await tryRSS();
    // If RSS fails, try HTML
    if (items.length === 0) {
        items = await fallbackHTML();
        if (items.length === 0) {
            errors.push('Both RSS and HTML scraping failed for MAS');
        }
    }
    // Filter to crypto-related
    const cryptoItems = items.filter(i => i.is_crypto_related);
    console.log(`[MAS] ${cryptoItems.length}/${items.length} items are crypto-related`);
    // Dedupe
    const seen = new Set();
    const deduped = cryptoItems.filter(item => {
        if (seen.has(item.content_hash))
            return false;
        seen.add(item.content_hash);
        return true;
    });
    return { source: 'MAS', items: deduped, errors };
}
if (import.meta.url === `file://${process.argv[1]}`) {
    scrapeMAS().then(r => console.log(JSON.stringify(r, null, 2)));
}

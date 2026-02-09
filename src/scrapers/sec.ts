/**
 * SEC RSS Scraper
 * 
 * Sources:
 * - Press releases: https://www.sec.gov/news/pressreleases.rss
 * - Litigation releases: https://www.sec.gov/rss/litigation/litreleases.xml
 */

import Parser from 'rss-parser';
import crypto from 'crypto';
import type { RegulatoryUpdate, ScrapeResult } from '../types.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'CryptoRegulatoryTracker/1.0 (compliance research)',
  },
});

const SEC_FEEDS = [
  {
    url: 'https://www.sec.gov/news/pressreleases.rss',
    name: 'Press Releases',
  },
  {
    url: 'https://www.sec.gov/rss/litigation/litreleases.xml', 
    name: 'Litigation Releases',
  },
];

// Keywords to filter crypto-related content (precise - avoid "exchange" alone)
const CRYPTO_KEYWORDS = [
  'crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'digital asset',
  'blockchain', 'defi', 'stablecoin', 'nft', 'ico',
  'binance', 'coinbase', 'kraken', 'ftx', 'celsius', 'terraform',
  'virtual currency', 'digital currency', 'crypto exchange', 'token offering',
];

function isPotentiallyCrypto(text: string): boolean {
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some(kw => lower.includes(kw));
}

function hashContent(title: string, url: string): string {
  return crypto.createHash('sha256').update(`${title}|${url}`).digest('hex');
}

export async function scrapeSEC(): Promise<ScrapeResult> {
  const items: RegulatoryUpdate[] = [];
  const errors: string[] = [];

  for (const feed of SEC_FEEDS) {
    try {
      console.log(`[SEC] Fetching ${feed.name}...`);
      const result = await parser.parseURL(feed.url);
      
      for (const entry of result.items) {
        if (!entry.title || !entry.link) continue;

        const update: RegulatoryUpdate = {
          source: 'SEC',
          title: entry.title,
          summary: entry.contentSnippet?.slice(0, 500),
          source_url: entry.link,
          published_at: entry.pubDate ? new Date(entry.pubDate) : undefined,
          scraped_at: new Date(),
          content_hash: hashContent(entry.title, entry.link),
          // Pre-filter: mark as potentially crypto-related
          is_crypto_related: isPotentiallyCrypto(entry.title + ' ' + (entry.contentSnippet || '')),
        };

        items.push(update);
      }
      
      console.log(`[SEC] Found ${result.items.length} items from ${feed.name}`);
    } catch (err) {
      const msg = `Failed to fetch ${feed.name}: ${err instanceof Error ? err.message : err}`;
      console.error(`[SEC] ${msg}`);
      errors.push(msg);
    }
  }

  // Filter to only crypto-related for now
  const cryptoItems = items.filter(i => i.is_crypto_related);
  console.log(`[SEC] ${cryptoItems.length}/${items.length} items are crypto-related`);

  return {
    source: 'SEC',
    items: cryptoItems,
    errors,
  };
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running SEC scraper...\n');
  scrapeSEC().then(result => {
    console.log('\n--- Results ---');
    console.log(JSON.stringify(result, null, 2));
  });
}

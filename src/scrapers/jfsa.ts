/**
 * JFSA HTML Scraper (Japan)
 * Source: https://www.fsa.go.jp/en/news/
 */

import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { RegulatoryUpdate, ScrapeResult } from '../types.js';

const JFSA_URL = 'https://www.fsa.go.jp/en/news/';

const CRYPTO_KEYWORDS = [
  'crypto', 'virtual currency', 'digital asset', 'blockchain', 'token',
  'stablecoin', 'exchange', 'bitcoin', 'ethereum',
];

function isPotentiallyCrypto(text: string): boolean {
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some(kw => lower.includes(kw));
}

function hashContent(title: string, url: string): string {
  return crypto.createHash('sha256').update(`${title}|${url}`).digest('hex');
}

export async function scrapeJFSA(): Promise<ScrapeResult> {
  const items: RegulatoryUpdate[] = [];
  const errors: string[] = [];

  try {
    console.log('[JFSA] Fetching page...');
    const response = await fetch(JFSA_URL, {
      headers: { 'User-Agent': 'CryptoRegulatoryTracker/1.0' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // JFSA news page structure: news items in list
    $('ul.news-list li, .news-item, article').each((_, el) => {
      const $el = $(el);
      const $link = $el.find('a').first();
      const title = $link.text().trim() || $el.text().trim().slice(0, 200);
      let href = $link.attr('href');

      if (!title || !href) return;

      // Make absolute URL
      if (href.startsWith('/')) {
        href = `https://www.fsa.go.jp${href}`;
      }

      // Try to extract date
      const dateText = $el.find('.date, time').text().trim();
      let publishedAt: Date | undefined;
      if (dateText) {
        const parsed = new Date(dateText);
        if (!isNaN(parsed.getTime())) {
          publishedAt = parsed;
        }
      }

      const update: RegulatoryUpdate = {
        source: 'JFSA',
        title: title.slice(0, 500),
        source_url: href,
        published_at: publishedAt,
        scraped_at: new Date(),
        content_hash: hashContent(title, href),
        is_crypto_related: isPotentiallyCrypto(title),
      };

      items.push(update);
    });

    console.log(`[JFSA] Found ${items.length} items`);
  } catch (err) {
    const msg = `Failed to fetch JFSA: ${err instanceof Error ? err.message : err}`;
    console.error(`[JFSA] ${msg}`);
    errors.push(msg);
  }

  const cryptoItems = items.filter(i => i.is_crypto_related);
  console.log(`[JFSA] ${cryptoItems.length}/${items.length} items are crypto-related`);

  return { source: 'JFSA', items: cryptoItems, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeJFSA().then(r => console.log(JSON.stringify(r, null, 2)));
}

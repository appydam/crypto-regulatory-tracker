/**
 * VARA HTML Scraper (Dubai)
 * Source: https://www.vara.ae/en/news/
 */

import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { RegulatoryUpdate, ScrapeResult } from '../types.js';

const VARA_URL = 'https://www.vara.ae/en/news/';

function hashContent(title: string, url: string): string {
  return crypto.createHash('sha256').update(`${title}|${url}`).digest('hex');
}

export async function scrapeVARA(): Promise<ScrapeResult> {
  const items: RegulatoryUpdate[] = [];
  const errors: string[] = [];

  try {
    console.log('[VARA] Fetching page...');
    const response = await fetch(VARA_URL, {
      headers: { 'User-Agent': 'CryptoRegulatoryTracker/1.0' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // VARA is crypto-focused, so all news is relevant
    $('article, .news-card, .news-item, [class*="news"]').each((_, el) => {
      const $el = $(el);
      const $link = $el.find('a').first();
      const title = $el.find('h2, h3, .title').text().trim() || $link.text().trim();
      let href = $link.attr('href');

      if (!title || !href) return;

      // Make absolute URL
      if (href.startsWith('/')) {
        href = `https://www.vara.ae${href}`;
      }

      // Extract date if available
      const dateText = $el.find('.date, time, [class*="date"]').text().trim();
      let publishedAt: Date | undefined;
      if (dateText) {
        const parsed = new Date(dateText);
        if (!isNaN(parsed.getTime())) {
          publishedAt = parsed;
        }
      }

      const summary = $el.find('p, .excerpt, .summary').first().text().trim().slice(0, 500);

      const update: RegulatoryUpdate = {
        source: 'VARA',
        title: title.slice(0, 500),
        summary: summary || undefined,
        source_url: href,
        published_at: publishedAt,
        scraped_at: new Date(),
        content_hash: hashContent(title, href),
        is_crypto_related: true, // VARA is crypto-specific
      };

      items.push(update);
    });

    console.log(`[VARA] Found ${items.length} items`);
  } catch (err) {
    const msg = `Failed to fetch VARA: ${err instanceof Error ? err.message : err}`;
    console.error(`[VARA] ${msg}`);
    errors.push(msg);
  }

  return { source: 'VARA', items, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeVARA().then(r => console.log(JSON.stringify(r, null, 2)));
}

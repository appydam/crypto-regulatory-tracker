/**
 * VARA HTML Scraper (Dubai)
 * Source: https://www.vara.ae/en/news/
 * 
 * VARA is Dubai's Virtual Assets Regulatory Authority - ALL their news is crypto-related
 */

import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { RegulatoryUpdate, ScrapeResult } from '../types.js';

const VARA_URL = 'https://www.vara.ae/en/news/';

function hashContent(title: string, url: string): string {
  return crypto.createHash('sha256').update(`${title}|${url}`).digest('hex');
}

function parseDate(dateStr: string): Date | undefined {
  // Parse "11 Jun 2025" format
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return undefined;
}

export async function scrapeVARA(): Promise<ScrapeResult> {
  const items: RegulatoryUpdate[] = [];
  const errors: string[] = [];

  try {
    console.log('[VARA] Fetching page...');
    const response = await fetch(VARA_URL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoRegulatoryTracker/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try multiple selector strategies
    // Strategy 1: Look for news card structures
    $('[class*="card"], [class*="news"], [class*="item"], article').each((_, el) => {
      const $el = $(el);
      
      // Find title (h2, h3, or first link text)
      const titleEl = $el.find('h2, h3, h4, [class*="title"]').first();
      const title = titleEl.text().trim();
      
      // Find link
      const $link = $el.find('a[href*="/news/"]').first();
      let href = $link.attr('href');
      
      if (!title || !href) return;

      // Make absolute URL
      if (href.startsWith('/')) {
        href = `https://www.vara.ae${href}`;
      }

      // Find date
      const dateText = $el.find('time, [class*="date"], [datetime]').text().trim() ||
                       $el.text().match(/\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i)?.[0];
      
      // Find summary
      const summary = $el.find('p').first().text().trim().slice(0, 500);

      const update: RegulatoryUpdate = {
        source: 'VARA',
        title: title.slice(0, 500),
        summary: summary || undefined,
        source_url: href,
        published_at: dateText ? parseDate(dateText) : undefined,
        scraped_at: new Date(),
        content_hash: hashContent(title, href),
        is_crypto_related: true, // VARA is crypto-specific
      };

      items.push(update);
    });

    // Strategy 2: Parse h3 headers that look like news titles
    if (items.length === 0) {
      $('h3').each((_, el) => {
        const $el = $(el);
        const title = $el.text().trim();
        const $link = $el.find('a').first() || $el.next('a').first() || $el.parent().find('a[href*="news"]').first();
        let href = $link.attr?.('href') || $el.parent().find('a[href*="news"]').attr('href');

        if (!title || !href) return;
        if (href.startsWith('/')) href = `https://www.vara.ae${href}`;

        // Look for date before the title
        const prevText = $el.prev().text().trim();
        const dateMatch = prevText.match(/\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i);

        const update: RegulatoryUpdate = {
          source: 'VARA',
          title: title.slice(0, 500),
          source_url: href,
          published_at: dateMatch ? parseDate(dateMatch[0]) : undefined,
          scraped_at: new Date(),
          content_hash: hashContent(title, href),
          is_crypto_related: true,
        };

        items.push(update);
      });
    }

    // Dedupe by content_hash
    const seen = new Set<string>();
    const deduped = items.filter(item => {
      if (seen.has(item.content_hash)) return false;
      seen.add(item.content_hash);
      return true;
    });

    console.log(`[VARA] Found ${deduped.length} items`);
    return { source: 'VARA', items: deduped, errors };
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

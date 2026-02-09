/**
 * MAS Browser Scraper (Singapore)
 * Uses Puppeteer for JS-rendered content
 * Source: https://www.mas.gov.sg/news
 */

import puppeteer from 'puppeteer';
import crypto from 'crypto';
import type { RegulatoryUpdate, ScrapeResult } from '../types.js';

const MAS_NEWS_URL = 'https://www.mas.gov.sg/news';

const CRYPTO_KEYWORDS = [
  'crypto', 'digital asset', 'digital payment token', 'dpt', 'blockchain',
  'stablecoin', 'defi', 'virtual asset', 'payment token',
  'cryptocurrency', 'digital currency',
];

function isPotentiallyCrypto(text: string): boolean {
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some(kw => lower.includes(kw));
}

function hashContent(title: string, url: string): string {
  return crypto.createHash('sha256').update(`${title}|${url}`).digest('hex');
}

export async function scrapeMASBrowser(): Promise<ScrapeResult> {
  const items: RegulatoryUpdate[] = [];
  const errors: string[] = [];

  let browser;
  try {
    console.log('[MAS] Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('[MAS] Navigating to news page...');
    await page.goto(MAS_NEWS_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for news content to load
    await page.waitForSelector('a[href*="/news/"]', { timeout: 10000 }).catch(() => {
      console.log('[MAS] No news links found with selector');
    });

    // Extract news items
    const newsItems = await page.evaluate(() => {
      const results: Array<{title: string; url: string; date?: string; summary?: string}> = [];
      
      // Find all news links
      const links = document.querySelectorAll('a[href*="/news/"]');
      const seen = new Set<string>();
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        const title = link.textContent?.trim();
        
        if (!href || !title || title.length < 10) return;
        if (seen.has(href)) return;
        seen.add(href);
        
        // Try to find date near the link
        const parent = link.closest('article, .card, [class*="news"], [class*="item"], div');
        const dateEl = parent?.querySelector('time, [class*="date"], .date');
        const date = dateEl?.textContent?.trim();
        
        // Try to find summary
        const summaryEl = parent?.querySelector('p, .excerpt, .summary');
        const summary = summaryEl?.textContent?.trim();
        
        results.push({
          title,
          url: href.startsWith('/') ? `https://www.mas.gov.sg${href}` : href,
          date,
          summary,
        });
      });
      
      return results;
    });

    console.log(`[MAS] Found ${newsItems.length} news items`);

    for (const item of newsItems) {
      const update: RegulatoryUpdate = {
        source: 'MAS',
        title: item.title.slice(0, 500),
        summary: item.summary?.slice(0, 500),
        source_url: item.url,
        published_at: item.date ? new Date(item.date) : undefined,
        scraped_at: new Date(),
        content_hash: hashContent(item.title, item.url),
        is_crypto_related: isPotentiallyCrypto(item.title + ' ' + (item.summary || '')),
      };
      items.push(update);
    }

  } catch (err) {
    const msg = `Browser scrape failed: ${err instanceof Error ? err.message : err}`;
    console.error(`[MAS] ${msg}`);
    errors.push(msg);
  } finally {
    if (browser) await browser.close();
  }

  // Filter to crypto-related
  const cryptoItems = items.filter(i => i.is_crypto_related);
  console.log(`[MAS] ${cryptoItems.length}/${items.length} items are crypto-related`);

  // Dedupe
  const seen = new Set<string>();
  const deduped = cryptoItems.filter(item => {
    if (seen.has(item.content_hash)) return false;
    seen.add(item.content_hash);
    return true;
  });

  return { source: 'MAS', items: deduped, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeMASBrowser().then(r => console.log(JSON.stringify(r, null, 2)));
}

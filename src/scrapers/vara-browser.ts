/**
 * VARA Browser Scraper (Dubai)
 * Uses Puppeteer for JS-rendered content
 * Source: https://www.vara.ae/en/news/
 * 
 * VARA is Dubai's Virtual Assets Regulatory Authority - ALL news is crypto-related
 */

import puppeteer from 'puppeteer';
import crypto from 'crypto';
import type { RegulatoryUpdate, ScrapeResult } from '../types.js';

const VARA_URL = 'https://www.vara.ae/en/news/';

function hashContent(title: string, url: string): string {
  return crypto.createHash('sha256').update(`${title}|${url}`).digest('hex');
}

function parseDate(dateStr: string): Date | undefined {
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return undefined;
}

export async function scrapeVARABrowser(): Promise<ScrapeResult> {
  const items: RegulatoryUpdate[] = [];
  const errors: string[] = [];

  let browser;
  try {
    console.log('[VARA] Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('[VARA] Navigating to news page...');
    await page.goto(VARA_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for content
    await page.waitForSelector('h3', { timeout: 10000 });

    // Extract news items - VARA has h3 titles with nearby links
    const newsItems = await page.evaluate(() => {
      const results: Array<{title: string; url: string; date?: string; summary?: string}> = [];
      const seen = new Set<string>();
      
      // Get all h3 elements (news titles)
      const titles = document.querySelectorAll('h3');
      
      titles.forEach(titleEl => {
        const title = titleEl.textContent?.trim();
        if (!title || title.length < 10) return;
        
        // Find link - could be in h3 or nearby
        let linkEl = titleEl.querySelector('a');
        if (!linkEl) {
          // Look in parent container
          const parent = titleEl.parentElement;
          linkEl = parent?.querySelector('a[href*="/news/"]') || null;
        }
        if (!linkEl) {
          // Look in grandparent
          const grandparent = titleEl.parentElement?.parentElement;
          linkEl = grandparent?.querySelector('a[href*="/news/"]') || null;
        }
        
        let href = linkEl?.getAttribute('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        // Find date - look for pattern in surrounding text
        const container = titleEl.closest('div') || titleEl.parentElement;
        const containerText = container?.textContent || '';
        const dateMatch = containerText.match(/\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i);
        
        // Get summary from first paragraph in container
        const summaryEl = container?.querySelector('p');
        const summary = summaryEl?.textContent?.trim();

        results.push({
          title,
          url: href.startsWith('/') ? `https://www.vara.ae${href}` : href,
          date: dateMatch?.[0],
          summary: summary?.slice(0, 500),
        });
      });
      
      return results;
    });

    console.log(`[VARA] Found ${newsItems.length} news items`);

    for (const item of newsItems) {
      const update: RegulatoryUpdate = {
        source: 'VARA',
        title: item.title.slice(0, 500),
        summary: item.summary,
        source_url: item.url,
        published_at: item.date ? parseDate(item.date) : undefined,
        scraped_at: new Date(),
        content_hash: hashContent(item.title, item.url),
        is_crypto_related: true, // VARA is crypto-specific
      };
      items.push(update);
    }

  } catch (err) {
    const msg = `Browser scrape failed: ${err instanceof Error ? err.message : err}`;
    console.error(`[VARA] ${msg}`);
    errors.push(msg);
  } finally {
    if (browser) await browser.close();
  }

  // Dedupe by hash
  const seen = new Set<string>();
  const deduped = items.filter(item => {
    if (seen.has(item.content_hash)) return false;
    seen.add(item.content_hash);
    return true;
  });

  console.log(`[VARA] ${deduped.length} unique items`);
  return { source: 'VARA', items: deduped, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeVARABrowser().then(r => console.log(JSON.stringify(r, null, 2)));
}

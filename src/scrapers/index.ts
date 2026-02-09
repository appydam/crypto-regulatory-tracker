/**
 * Scraper index — run all scrapers
 * Uses browser scrapers as fallback for JS-rendered sites
 */

import { scrapeSEC } from './sec.js';
import { scrapeESMA } from './esma.js';
import { scrapeMAS } from './mas.js';
import { scrapeJFSA } from './jfsa.js';
import { scrapeVARA } from './vara.js';
import { scrapeMASBrowser } from './mas-browser.js';
import { scrapeVARABrowser } from './vara-browser.js';
import type { ScrapeResult } from '../types.js';

export { scrapeSEC, scrapeESMA, scrapeMAS, scrapeJFSA, scrapeVARA, scrapeMASBrowser, scrapeVARABrowser };

// Environment flag to force browser scrapers
const USE_BROWSER = process.env.USE_BROWSER === 'true';

export async function scrapeAll(): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  console.log('\n=== Running All Scrapers ===\n');

  // Run in sequence to respect rate limits
  results.push(await scrapeSEC());
  await sleep(1000);
  
  results.push(await scrapeESMA());
  await sleep(1000);
  
  // MAS: Try regular first, fallback to browser
  let masResult = await scrapeMAS();
  if (masResult.items.length === 0 || USE_BROWSER) {
    console.log('[MAS] Trying browser scraper...');
    masResult = await scrapeMASBrowser();
  }
  results.push(masResult);
  await sleep(1000);
  
  results.push(await scrapeJFSA());
  await sleep(1000);
  
  // VARA: Try regular first, fallback to browser
  let varaResult = await scrapeVARA();
  if (varaResult.items.length === 0 || USE_BROWSER) {
    console.log('[VARA] Trying browser scraper...');
    varaResult = await scrapeVARABrowser();
  }
  results.push(varaResult);

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

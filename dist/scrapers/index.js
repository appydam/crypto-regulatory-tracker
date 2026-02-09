/**
 * Scraper index — run all scrapers
 */
import { scrapeSEC } from './sec.js';
import { scrapeESMA } from './esma.js';
import { scrapeMAS } from './mas.js';
import { scrapeJFSA } from './jfsa.js';
import { scrapeVARA } from './vara.js';
export { scrapeSEC, scrapeESMA, scrapeMAS, scrapeJFSA, scrapeVARA };
export async function scrapeAll() {
    const results = [];
    console.log('\n=== Running All Scrapers ===\n');
    // Run in sequence to respect rate limits
    results.push(await scrapeSEC());
    await sleep(1000);
    results.push(await scrapeESMA());
    await sleep(1000);
    results.push(await scrapeMAS());
    await sleep(1000);
    results.push(await scrapeJFSA());
    await sleep(1000);
    results.push(await scrapeVARA());
    return results;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main scrape runner
 */
import { scrapeAll } from './scrapers/index.js';
import { upsertUpdates } from './db.js';
import { validateConfig } from './config.js';
export async function runScrape() {
    console.log('Crypto Regulatory Tracker — Scrape Cycle');
    console.log('========================================\n');
    const { valid, missing } = validateConfig();
    if (!valid) {
        console.log(`[Config] Missing: ${missing.join(', ')}`);
        console.log('[Config] Running in local mode (no persistence)\n');
    }
    const results = await scrapeAll();
    // Collect all items
    const allItems = [];
    const allErrors = [];
    for (const result of results) {
        allItems.push(...result.items);
        allErrors.push(...result.errors);
    }
    console.log('\n=== Summary ===');
    for (const result of results) {
        console.log(`${result.source}: ${result.items.length} items, ${result.errors.length} errors`);
    }
    console.log(`\nTotal: ${allItems.length} crypto-related items`);
    // Save to database
    let saved = 0;
    if (allItems.length > 0) {
        saved = await upsertUpdates(allItems);
        console.log(`Saved: ${saved} items to database`);
    }
    // Show sample items
    if (allItems.length > 0) {
        console.log('\n=== Sample Items ===');
        for (const item of allItems.slice(0, 5)) {
            console.log(`\n[${item.source}] ${item.title.slice(0, 80)}...`);
            console.log(`  URL: ${item.source_url}`);
        }
        if (allItems.length > 5) {
            console.log(`\n... and ${allItems.length - 5} more items`);
        }
    }
    return { total: allItems.length, saved, errors: allErrors };
}
// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
    runScrape().then(({ total, saved, errors }) => {
        console.log(`\n✓ Done: ${total} items found, ${saved} saved, ${errors.length} errors`);
        process.exit(errors.length > 0 ? 1 : 0);
    });
}

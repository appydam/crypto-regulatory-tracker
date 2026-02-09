/**
 * LLM Classification with Claude Haiku
 */
import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { getUnclassifiedUpdates, updateClassification } from './db.js';
const SYSTEM_PROMPT = `You are a crypto regulatory analyst. Classify regulatory updates.

For each update, determine:
1. is_crypto_related: true if about cryptocurrency, digital assets, blockchain, DeFi, stablecoins, NFTs, or crypto exchanges
2. category: enforcement | guidance | rule_change | announcement | other
3. impact_level: high (major enforcement, new rules) | medium (guidance, updates) | low (routine, minor)

Respond with JSON only:
{"is_crypto_related": boolean, "category": string, "impact_level": string, "reasoning": string}`;
export async function classifyUpdate(client, update) {
    const prompt = `Classify this regulatory update:

Source: ${update.source}
Title: ${update.title}
Summary: ${update.summary || 'N/A'}
URL: ${update.source_url}`;
    try {
        const response = await client.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 256,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
        });
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const json = text.match(/\{[\s\S]*\}/)?.[0];
        if (!json) {
            console.error('[Classify] No JSON in response');
            return null;
        }
        return JSON.parse(json);
    }
    catch (err) {
        console.error('[Classify] Error:', err instanceof Error ? err.message : err);
        return null;
    }
}
export async function classifyUnprocessed(limit = 50) {
    if (!config.anthropic.apiKey) {
        console.log('[Classify] No API key configured');
        return 0;
    }
    const client = new Anthropic({ apiKey: config.anthropic.apiKey });
    const updates = await getUnclassifiedUpdates(limit);
    if (updates.length === 0) {
        console.log('[Classify] No unclassified updates');
        return 0;
    }
    console.log(`[Classify] Processing ${updates.length} updates...`);
    let classified = 0;
    for (const update of updates) {
        const result = await classifyUpdate(client, update);
        if (result && update.id) {
            await updateClassification(update.id, {
                is_crypto_related: result.is_crypto_related,
                category: result.category,
                impact_level: result.impact_level,
            });
            classified++;
            console.log(`[Classify] ${update.source}: ${result.impact_level} - ${update.title.slice(0, 50)}...`);
        }
        // Rate limit
        await new Promise(r => setTimeout(r, 200));
    }
    console.log(`[Classify] Classified ${classified}/${updates.length} updates`);
    return classified;
}
// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
    classifyUnprocessed().then(n => console.log(`\nClassified ${n} updates`));
}

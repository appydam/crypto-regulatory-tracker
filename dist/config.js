/**
 * Configuration — loaded from environment variables
 */
import 'dotenv/config';
export const config = {
    supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
    },
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
    resend: {
        apiKey: process.env.RESEND_API_KEY || '',
        fromEmail: process.env.FROM_EMAIL || 'updates@cryptoregtracker.com',
    },
    scrape: {
        intervalHours: 6,
        rateLimitMs: 1000,
    },
};
export function validateConfig() {
    const missing = [];
    if (!config.supabase.url)
        missing.push('SUPABASE_URL');
    if (!config.supabase.anonKey)
        missing.push('SUPABASE_ANON_KEY');
    if (!config.anthropic.apiKey)
        missing.push('ANTHROPIC_API_KEY');
    if (!config.resend.apiKey)
        missing.push('RESEND_API_KEY');
    return { valid: missing.length === 0, missing };
}

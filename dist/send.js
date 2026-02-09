/**
 * Email Delivery via Resend
 */
import { Resend } from 'resend';
import { config } from './config.js';
import { getActiveSubscribers } from './db.js';
export async function sendReport(html, subject, tier) {
    if (!config.resend.apiKey) {
        console.log('[Send] No Resend API key configured');
        return { sent: 0, errors: ['No API key'] };
    }
    const resend = new Resend(config.resend.apiKey);
    const subscribers = await getActiveSubscribers(tier);
    if (subscribers.length === 0) {
        console.log('[Send] No active subscribers');
        return { sent: 0, errors: [] };
    }
    console.log(`[Send] Sending to ${subscribers.length} subscribers...`);
    let sent = 0;
    const errors = [];
    for (const sub of subscribers) {
        try {
            await resend.emails.send({
                from: config.resend.fromEmail,
                to: sub.email,
                subject,
                html,
            });
            sent++;
            console.log(`[Send] ✓ ${sub.email}`);
        }
        catch (err) {
            const msg = `Failed to send to ${sub.email}: ${err instanceof Error ? err.message : err}`;
            console.error(`[Send] ✗ ${msg}`);
            errors.push(msg);
        }
        // Rate limit
        await new Promise(r => setTimeout(r, 100));
    }
    console.log(`[Send] Sent ${sent}/${subscribers.length} emails`);
    return { sent, errors };
}
export async function sendTestEmail(to, html, subject) {
    if (!config.resend.apiKey) {
        console.log('[Send] No Resend API key configured');
        return false;
    }
    const resend = new Resend(config.resend.apiKey);
    try {
        await resend.emails.send({
            from: config.resend.fromEmail,
            to,
            subject,
            html,
        });
        console.log(`[Send] Test email sent to ${to}`);
        return true;
    }
    catch (err) {
        console.error(`[Send] Error:`, err instanceof Error ? err.message : err);
        return false;
    }
}
// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
    const testHtml = '<h1>Test</h1><p>This is a test email from Crypto Regulatory Tracker.</p>';
    const testEmail = process.argv[2];
    if (testEmail) {
        sendTestEmail(testEmail, testHtml, 'Test - Crypto Regulatory Tracker').then(ok => {
            console.log(ok ? 'Sent!' : 'Failed');
        });
    }
    else {
        console.log('Usage: npm run send <email>');
    }
}

/**
 * Crypto Regulatory Tracker — Main Entry Point
 * 
 * Full pipeline: scrape → classify → report → send
 */

import { runScrape } from './scrape.js';
import { classifyUnprocessed } from './classify.js';
import { generateWeeklyReport } from './report.js';
import { sendReport } from './send.js';
import { validateConfig } from './config.js';

async function main() {
  const command = process.argv[2] || 'help';

  console.log('🔒 Crypto Regulatory Tracker\n');

  const { valid, missing } = validateConfig();

  switch (command) {
    case 'scrape':
      await runScrape();
      break;

    case 'classify':
      if (!valid && missing.includes('ANTHROPIC_API_KEY')) {
        console.log('Error: ANTHROPIC_API_KEY required for classification');
        process.exit(1);
      }
      await classifyUnprocessed();
      break;

    case 'report':
      const result = await generateWeeklyReport();
      if (result) {
        console.log('\n=== Report Preview ===\n');
        console.log(result.markdown);
        console.log(`\n✓ Report generated with ${result.count} updates`);
      }
      break;

    case 'send':
      const email = process.argv[3];
      if (!email) {
        console.log('Usage: npm run dev send <email>');
        process.exit(1);
      }
      // Generate and send test report
      const testReport = await generateWeeklyReport();
      if (testReport) {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'test@example.com',
          to: email,
          subject: '🔒 Crypto Regulatory Brief — Test',
          html: testReport.html,
        });
        console.log(`✓ Test email sent to ${email}`);
      }
      break;

    case 'pipeline':
      // Full pipeline
      console.log('=== Step 1: Scrape ===\n');
      await runScrape();
      
      console.log('\n=== Step 2: Classify ===\n');
      await classifyUnprocessed();
      
      console.log('\n=== Step 3: Generate Report ===\n');
      const report = await generateWeeklyReport();
      if (report) {
        console.log(`✓ Report ready with ${report.count} updates`);
      }
      break;

    case 'help':
    default:
      console.log(`Commands:
  scrape    - Fetch updates from all sources
  classify  - Classify unprocessed updates with LLM
  report    - Generate weekly report
  send      - Send test email: npm run dev send <email>
  pipeline  - Run full pipeline: scrape → classify → report

Environment Variables:
  SUPABASE_URL        - Supabase project URL
  SUPABASE_ANON_KEY   - Supabase anon key
  ANTHROPIC_API_KEY   - Claude API key for classification
  RESEND_API_KEY      - Resend API key for email
  FROM_EMAIL          - Sender email address
`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

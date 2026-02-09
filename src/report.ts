/**
 * Weekly Report Generator
 */

import { getUpdatesForReport, createReport } from './db.js';
import type { RegulatoryUpdate, WeeklyReport } from './types.js';

const IMPACT_EMOJI = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

const SOURCE_NAMES = {
  SEC: 'SEC (US)',
  ESMA: 'ESMA (EU)',
  MAS: 'MAS (Singapore)',
  JFSA: 'JFSA (Japan)',
  VARA: 'VARA (Dubai)',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByImpact(updates: RegulatoryUpdate[]): Record<string, RegulatoryUpdate[]> {
  const groups: Record<string, RegulatoryUpdate[]> = { high: [], medium: [], low: [] };
  
  for (const update of updates) {
    const level = update.impact_level || 'low';
    groups[level].push(update);
  }
  
  return groups;
}

export function generateMarkdown(
  updates: RegulatoryUpdate[],
  weekStart: Date,
  weekEnd: Date
): string {
  const groups = groupByImpact(updates);
  const weekRange = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

  let md = `# 🔒 Crypto Regulatory Brief — Week of ${weekRange}\n\n`;
  md += `*${updates.length} regulatory updates across 5 jurisdictions*\n\n`;
  md += `---\n\n`;

  // High Impact
  if (groups.high.length > 0) {
    md += `## ${IMPACT_EMOJI.high} High Impact\n\n`;
    for (const update of groups.high) {
      md += formatUpdate(update);
    }
    md += `---\n\n`;
  }

  // Medium Impact
  if (groups.medium.length > 0) {
    md += `## ${IMPACT_EMOJI.medium} Medium Impact\n\n`;
    for (const update of groups.medium) {
      md += formatUpdate(update);
    }
    md += `---\n\n`;
  }

  // Low Impact
  if (groups.low.length > 0) {
    md += `## ${IMPACT_EMOJI.low} Low Impact / Monitoring\n\n`;
    for (const update of groups.low) {
      const source = SOURCE_NAMES[update.source] || update.source;
      md += `- **${source}:** ${update.title.trim()}\n`;
    }
    md += `\n---\n\n`;
  }

  md += `*You're receiving this because you subscribed to Crypto Compliance Weekly.*\n`;
  md += `*[Unsubscribe](#) | [Upgrade to Pro](#)*\n`;

  return md;
}

function formatUpdate(update: RegulatoryUpdate): string {
  const source = SOURCE_NAMES[update.source] || update.source;
  const date = update.published_at ? formatDate(update.published_at) : 'Recent';
  
  let md = `### ${update.title.trim()}\n`;
  md += `**Source:** ${source} | **Date:** ${date}\n\n`;
  
  if (update.summary) {
    md += `${update.summary.trim()}\n\n`;
  }
  
  md += `[Read full announcement →](${update.source_url})\n\n`;
  
  return md;
}

export function markdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  let html = markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap in basic HTML
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1a1a1a; }
    h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    h3 { color: #444; }
    a { color: #0066cc; }
    hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    li { margin: 4px 0; }
  </style>
</head>
<body>
<p>${html}</p>
</body>
</html>`;
}

export async function generateWeeklyReport(
  weekStart?: Date,
  weekEnd?: Date
): Promise<{ markdown: string; html: string; count: number } | null> {
  // Default to last 7 days
  const end = weekEnd || new Date();
  const start = weekStart || new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

  console.log(`[Report] Generating report for ${formatDate(start)} - ${formatDate(end)}`);

  const updates = await getUpdatesForReport(start, end);
  
  if (updates.length === 0) {
    console.log('[Report] No crypto-related updates found for this period');
    return null;
  }

  console.log(`[Report] Found ${updates.length} updates`);

  const markdown = generateMarkdown(updates, start, end);
  const html = markdownToHtml(markdown);

  // Save to database
  await createReport({
    week_start: start,
    week_end: end,
    status: 'draft',
    markdown_content: markdown,
    html_content: html,
    update_count: updates.length,
  });

  return { markdown, html, count: updates.length };
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  generateWeeklyReport().then(result => {
    if (result) {
      console.log('\n=== Generated Report ===\n');
      console.log(result.markdown);
    }
  });
}

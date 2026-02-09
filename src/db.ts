/**
 * Supabase database client
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';
import type { RegulatoryUpdate, WeeklyReport, Subscriber } from './types.js';

let supabase: SupabaseClient | null = null;

export function getDb(): SupabaseClient | null {
  if (!config.supabase.url || !config.supabase.anonKey) {
    return null;
  }
  if (!supabase) {
    supabase = createClient(config.supabase.url, config.supabase.anonKey);
  }
  return supabase;
}

export async function upsertUpdates(updates: RegulatoryUpdate[]): Promise<number> {
  const db = getDb();
  if (!db) {
    console.log('[DB] No database configured, skipping upsert');
    return 0;
  }

  const { data, error } = await db
    .from('regulatory_updates')
    .upsert(
      updates.map(u => ({
        ...u,
        published_at: u.published_at?.toISOString(),
        scraped_at: u.scraped_at?.toISOString() || new Date().toISOString(),
      })),
      { onConflict: 'source_url' }
    )
    .select();

  if (error) {
    console.error('[DB] Upsert error:', error.message);
    return 0;
  }

  return data?.length || 0;
}

export async function getUnclassifiedUpdates(limit = 50): Promise<RegulatoryUpdate[]> {
  const db = getDb();
  if (!db) return [];

  const { data, error } = await db
    .from('regulatory_updates')
    .select('*')
    .is('is_crypto_related', null)
    .order('scraped_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[DB] Fetch error:', error.message);
    return [];
  }

  return data || [];
}

export async function updateClassification(
  id: string,
  classification: { is_crypto_related: boolean; category: string; impact_level: string }
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const { error } = await db
    .from('regulatory_updates')
    .update(classification)
    .eq('id', id);

  if (error) {
    console.error('[DB] Update error:', error.message);
  }
}

export async function getUpdatesForReport(
  weekStart: Date,
  weekEnd: Date
): Promise<RegulatoryUpdate[]> {
  const db = getDb();
  if (!db) return [];

  const { data, error } = await db
    .from('regulatory_updates')
    .select('*')
    .eq('is_crypto_related', true)
    .gte('published_at', weekStart.toISOString())
    .lte('published_at', weekEnd.toISOString())
    .order('impact_level', { ascending: true })
    .order('published_at', { ascending: false });

  if (error) {
    console.error('[DB] Fetch error:', error.message);
    return [];
  }

  return data || [];
}

export async function createReport(report: Omit<WeeklyReport, 'id'>): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from('weekly_reports')
    .insert({
      ...report,
      week_start: report.week_start.toISOString().split('T')[0],
      week_end: report.week_end.toISOString().split('T')[0],
    })
    .select('id')
    .single();

  if (error) {
    console.error('[DB] Insert error:', error.message);
    return null;
  }

  return data?.id || null;
}

export async function getActiveSubscribers(tier?: string): Promise<Subscriber[]> {
  const db = getDb();
  if (!db) return [];

  let query = db
    .from('subscribers')
    .select('*')
    .is('unsubscribed_at', null);

  if (tier) {
    query = query.eq('tier', tier);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[DB] Fetch error:', error.message);
    return [];
  }

  return data || [];
}

export type Source = 'SEC' | 'ESMA' | 'MAS' | 'JFSA' | 'VARA';
export type Category = 'enforcement' | 'guidance' | 'rule_change' | 'announcement' | 'other';
export type ImpactLevel = 'high' | 'medium' | 'low';

export interface RegulatoryUpdate {
  id?: string;
  source: Source;
  title: string;
  summary?: string;
  source_url: string;
  published_at?: Date;
  scraped_at?: Date;
  is_crypto_related?: boolean | null;
  category?: Category | null;
  impact_level?: ImpactLevel | null;
  content_hash: string;
  included_in_report_id?: string | null;
}

export interface ScrapeResult {
  source: Source;
  items: RegulatoryUpdate[];
  errors: string[];
}

export interface ClassificationResult {
  is_crypto_related: boolean;
  category: Category;
  impact_level: ImpactLevel;
  reasoning: string;
}

export interface WeeklyReport {
  id?: string;
  week_start: Date;
  week_end: Date;
  status: 'draft' | 'review' | 'published' | 'sent';
  markdown_content?: string;
  html_content?: string;
  update_count: number;
}

export interface Subscriber {
  id: string;
  email: string;
  company?: string;
  tier: 'free' | 'pro' | 'enterprise';
}

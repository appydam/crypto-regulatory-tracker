-- Crypto Regulatory Tracker Schema
-- Run in Supabase SQL Editor

-- Regulatory updates table
CREATE TABLE regulatory_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(20) NOT NULL,  -- 'SEC', 'ESMA', 'MAS', 'JFSA', 'VARA'
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- LLM classifications (populated later)
  is_crypto_related BOOLEAN DEFAULT NULL,
  category VARCHAR(50),  -- 'enforcement', 'guidance', 'rule_change', 'announcement'
  impact_level VARCHAR(10),  -- 'high', 'medium', 'low'
  
  -- Content hash for change detection
  content_hash VARCHAR(64),
  
  -- Report linkage
  included_in_report_id UUID,
  
  CONSTRAINT unique_source_url UNIQUE (source_url)
);

-- Indexes
CREATE INDEX idx_updates_published ON regulatory_updates(published_at DESC);
CREATE INDEX idx_updates_source ON regulatory_updates(source);
CREATE INDEX idx_updates_crypto ON regulatory_updates(is_crypto_related) WHERE is_crypto_related = TRUE;

-- Weekly reports table
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'review', 'published', 'sent'
  markdown_content TEXT,
  html_content TEXT,
  update_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_reports_week ON weekly_reports(week_start DESC);

-- Add foreign key after reports table exists
ALTER TABLE regulatory_updates 
  ADD CONSTRAINT fk_report 
  FOREIGN KEY (included_in_report_id) 
  REFERENCES weekly_reports(id);

-- Subscribers table
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  company TEXT,
  tier VARCHAR(20) DEFAULT 'free',  -- 'free', 'pro', 'enterprise'
  verified BOOLEAN DEFAULT FALSE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX idx_subscribers_tier ON subscribers(tier);
CREATE INDEX idx_subscribers_active ON subscribers(unsubscribed_at) WHERE unsubscribed_at IS NULL;

-- Scrape logs for monitoring
CREATE TABLE scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(20) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'running',  -- 'running', 'success', 'failed'
  items_found INT DEFAULT 0,
  items_new INT DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_scrape_logs_source ON scrape_logs(source, started_at DESC);

-- Enable Row Level Security (optional, for multi-tenant)
-- ALTER TABLE regulatory_updates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Add engagement tracking tables
-- Usage: psql -d virtual_office -f migrations/add-engagement-tables.sql

-- Agent daily stats (aggregated daily)
CREATE TABLE IF NOT EXISTS agent_daily_stats (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  conversations INTEGER DEFAULT 0,
  words INTEGER DEFAULT 0,
  tokens INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  praises INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, date)
);

-- Real token usage from Clawdbot (pushed via vo-push-usage.sh)
CREATE TABLE IF NOT EXISTS token_usage_log (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  session_key VARCHAR(255),
  model VARCHAR(255),
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date DATE DEFAULT CURRENT_DATE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_stats_agent_date ON agent_daily_stats(agent_id, date);
CREATE INDEX IF NOT EXISTS idx_token_log_agent_date ON token_usage_log(agent_id, date);
CREATE INDEX IF NOT EXISTS idx_token_log_date ON token_usage_log(date);

-- Insert placeholder data for today (for testing)
INSERT INTO agent_daily_stats (agent_id, date, conversations, words, tokens, tasks_completed)
VALUES 
  ('kevin小幫手', CURRENT_DATE, 0, 0, 0, 0),
  ('alex', CURRENT_DATE, 0, 0, 0, 0),
  ('lena', CURRENT_DATE, 0, 0, 0, 0),
  ('writer', CURRENT_DATE, 0, 0, 0, 0),
  ('n8n-bot', CURRENT_DATE, 0, 0, 0, 0),
  ('secguard', CURRENT_DATE, 0, 0, 0, 0)
ON CONFLICT (agent_id, date) DO NOTHING;

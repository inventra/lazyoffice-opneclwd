-- 安全設定表
CREATE TABLE IF NOT EXISTS security_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Port 掃描結果表
CREATE TABLE IF NOT EXISTS port_scan_results (
  id SERIAL PRIMARY KEY,
  port INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,  -- open/closed/filtered
  service VARCHAR(100),
  risk_level VARCHAR(20),  -- low/medium/high/critical
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prompt 審查記錄表
CREATE TABLE IF NOT EXISTS prompt_audit_log (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(50),
  prompt_text TEXT NOT NULL,
  is_safe BOOLEAN NOT NULL,
  risk_level VARCHAR(20),  -- safe/suspicious/blocked
  reason TEXT,
  action_taken VARCHAR(50),  -- allowed/blocked
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入預設設定
INSERT INTO security_settings (key, value) VALUES
  ('port_scan_interval_hours', '1'),
  ('prompt_guard_enabled', 'false'),
  ('last_port_scan', NULL)
ON CONFLICT (key) DO NOTHING;

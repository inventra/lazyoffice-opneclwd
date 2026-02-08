-- Virtual Office 資料庫初始化

-- 建立部門表
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立 agent 表
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  desk_x INTEGER,
  desk_y INTEGER,
  status VARCHAR(20) DEFAULT 'idle',
  current_task TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立任務表
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_by VARCHAR(50) REFERENCES agents(id),
  assigned_to VARCHAR(50) REFERENCES agents(id),
  dispatched_by VARCHAR(50) REFERENCES agents(id),
  department_id INTEGER REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立任務流轉表
CREATE TABLE IF NOT EXISTS task_flows (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id),
  from_agent_id VARCHAR(50) REFERENCES agents(id),
  to_agent_id VARCHAR(50) REFERENCES agents(id),
  action VARCHAR(50) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入預設部門
INSERT INTO departments (name, label) VALUES 
  ('secretary', '秘書室'),
  ('engineering', '工程部'),
  ('design', '設計部'),
  ('marketing', '行銷部'),
  ('content', '內容部')
ON CONFLICT (name) DO NOTHING;

-- 插入預設 agents（範例）
INSERT INTO agents (id, name, department_id, desk_x, desk_y, avatar_url) VALUES
  ('kevin', 'Kevin小幫手', 1, 20, 30, '/assets/avatars/kevin.png'),
  ('alex', 'Alex', 2, 40, 50, '/assets/avatars/alex.png'),
  ('lena', 'Lena', 5, 60, 50, '/assets/avatars/lena.png')
ON CONFLICT (id) DO NOTHING;
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
-- 新增 agents 表欄位
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS title VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS clawdbot_agent_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_detected TIMESTAMP;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_agents_clawdbot_id 
ON agents(clawdbot_agent_id);
-- Skills 表
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  version VARCHAR(50),
  path TEXT NOT NULL,
  package_json JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent-Skill 關聯表
CREATE TABLE IF NOT EXISTS agent_skills (
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
  skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agent_id, skill_id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_skill ON agent_skills(skill_id);

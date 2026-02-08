-- Virtual Office Database Schema
-- Generated: 2026-02-08

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  label VARCHAR(255),
  emoji VARCHAR(10),
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 200,
  height INTEGER DEFAULT 150,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agents
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  title VARCHAR(255),
  description TEXT,
  department_id INTEGER REFERENCES departments(id),
  telegram_bot VARCHAR(255),
  avatar_emoji VARCHAR(10),
  avatar_url TEXT,
  status VARCHAR(50) DEFAULT 'idle',
  current_task TEXT,
  desk_x INTEGER DEFAULT 0,
  desk_y INTEGER DEFAULT 0,
  clawdbot_agent_id VARCHAR(255) UNIQUE,
  last_detected TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skills
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  version VARCHAR(50),
  path TEXT NOT NULL,
  package_json JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent Skills (many-to-many)
CREATE TABLE IF NOT EXISTS agent_skills (
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
  skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agent_id, skill_id)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'normal',
  created_by INTEGER REFERENCES agents(id),
  assigned_to INTEGER REFERENCES agents(id),
  dispatched_by INTEGER REFERENCES agents(id),
  department_id INTEGER REFERENCES departments(id),
  notion_task_id VARCHAR(255),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Flows
CREATE TABLE IF NOT EXISTS task_flows (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  from_agent_id INTEGER REFERENCES agents(id),
  to_agent_id INTEGER REFERENCES agents(id),
  action VARCHAR(255),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Security Settings
CREATE TABLE IF NOT EXISTS security_settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Port Scan Results
CREATE TABLE IF NOT EXISTS port_scan_results (
  id SERIAL PRIMARY KEY,
  port INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL,
  service VARCHAR(255),
  risk_level VARCHAR(50),
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prompt Audit Log
CREATE TABLE IF NOT EXISTS prompt_audit_log (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255),
  prompt_text TEXT NOT NULL,
  is_safe BOOLEAN NOT NULL,
  risk_level VARCHAR(50),
  reason TEXT,
  action_taken VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_clawdbot_id ON agents(clawdbot_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_skill ON agent_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);

-- Insert default department
INSERT INTO departments (name, label, emoji) 
VALUES ('default', '預設部門', '🏢')
ON CONFLICT DO NOTHING;

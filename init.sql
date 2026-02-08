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

-- 新增 agents 表欄位
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS title VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS clawdbot_agent_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_detected TIMESTAMP;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_agents_clawdbot_id 
ON agents(clawdbot_agent_id);

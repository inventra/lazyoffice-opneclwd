-- 新增 agents 表的 salary 欄位
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS salary INTEGER DEFAULT 30000;

-- 更新現有 agents 的預設薪資
UPDATE agents 
SET salary = 30000 
WHERE salary IS NULL;

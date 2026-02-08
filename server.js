const express = require('express');
const crypto = require('crypto');
const { Pool } = require('pg');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const archiver = require('archiver');
const SkillReader = require('./services/skill-reader');
const PortScanner = require('./services/port-scanner');
const AgentDetector = require('./services/agent-detector');
const PromptGuard = require('./services/prompt-guard');
const promptCheckMiddleware = require('./middleware/prompt-check');

const SSE_TOKEN = process.env.SSE_TOKEN || crypto.randomUUID();
console.log(`🔐 SSE Token: ${SSE_TOKEN}`);

const app = express();
app.use(cors({
  origin: ['http://127.0.0.1:3210', 'http://localhost:3210'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests' }
});

const postLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30
});

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'virtual_office',
  user: process.env.PGUSER || process.env.USER,
  password: process.env.PGPASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// API: 取得 SSE Token（不需認證，供前端初始化使用）
app.get('/api/token', (req, res) => {
  res.json({ token: SSE_TOKEN });
});

// API: 取得所有部門
app.get('/api/departments', async (req, res) => {
  const result = await pool.query('SELECT * FROM departments ORDER BY id');
  res.json(result.rows);
});

// API: 取得所有員工
app.get('/api/agents', async (req, res) => {
  const result = await pool.query(`
    SELECT a.*, d.name as department_name, d.label as department_label
    FROM agents a
    LEFT JOIN departments d ON a.department_id = d.id
    ORDER BY a.id
  `);
  res.json(result.rows);
});

// API: 取得偵測到的 agents（必須在 /api/agents/:id 之前，避免 "detected" 被當成 ID）
app.get('/api/agents/detected', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
             d.name as department_name,
             COUNT(DISTINCT as2.skill_id) as skills_count
      FROM agents a
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN agent_skills as2 ON a.id = as2.agent_id
      WHERE a.clawdbot_agent_id IS NOT NULL
      GROUP BY a.id, d.name
      ORDER BY a.last_detected DESC NULLS LAST, a.name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get detected agents error:', error);
    res.status(500).json({ error: 'Failed to get detected agents' });
  }
});

// API: 取得單一 agent 詳情
app.get('/api/agents/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    
    // 取得 agent 基本資料
    const agentResult = await pool.query(`
      SELECT a.*, d.name as department_name, d.label as department_label
      FROM agents a
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.id = $1
    `, [agentId]);
    
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: '員工不存在' });
    }
    
    const agent = agentResult.rows[0];
    
    // 取得 skills
    const skillsResult = await pool.query(`
      SELECT s.name, s.description
      FROM skills s
      INNER JOIN agent_skills as2 ON s.id = as2.skill_id
      WHERE as2.agent_id = $1
    `, [agentId]);
    
    agent.skills = skillsResult.rows;
    
    // 取得今日任務
    const tasksResult = await pool.query(`
      SELECT * FROM tasks
      WHERE assigned_to = $1 AND DATE(created_at) = CURRENT_DATE
      ORDER BY created_at DESC
    `, [agentId]);
    
    agent.today_tasks = tasksResult.rows;
    
    // 統計資料
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed') as today_completed,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'completed') as week_completed
      FROM tasks
      WHERE assigned_to = $1
    `, [agentId]);
    
    agent.stats = statsResult.rows[0];
    
    // 統一欄位名稱（前端期望的欄位）
    agent.avatar = agent.avatar_url;
    agent.role = agent.title;
    agent.monthly_salary = agent.salary || 30000;
    
    res.json({ ok: true, agent });
  } catch (error) {
    console.error('Get agent detail error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get agent detail' });
  }
});

// API: 取得所有任務
app.get('/api/tasks', async (req, res) => {
  const result = await pool.query(`
    SELECT t.*,
      creator.name as creator_name,
      assignee.name as assignee_name,
      dispatcher.name as dispatcher_name,
      d.label as department_label
    FROM tasks t
    LEFT JOIN agents creator ON t.created_by = creator.id
    LEFT JOIN agents assignee ON t.assigned_to = assignee.id
    LEFT JOIN agents dispatcher ON t.dispatched_by = dispatcher.id
    LEFT JOIN departments d ON t.department_id = d.id
    ORDER BY t.created_at DESC
  `);
  res.json(result.rows);
});

// API: 取得任務流轉記錄
app.get('/api/flows', async (req, res) => {
  const result = await pool.query(`
    SELECT f.*,
      fa.name as from_name, fa.desk_x as from_x, fa.desk_y as from_y,
      ta.name as to_name, ta.desk_x as to_x, ta.desk_y as to_y,
      t.title as task_title
    FROM task_flows f
    LEFT JOIN agents fa ON f.from_agent_id = fa.id
    LEFT JOIN agents ta ON f.to_agent_id = ta.id
    LEFT JOIN tasks t ON f.task_id = t.id
    ORDER BY f.created_at DESC
  `);
  res.json(result.rows);
});

// API: 更新員工狀態
app.patch('/api/agents/:id', async (req, res) => {
  const { status, current_task } = req.body;
  const result = await pool.query(
    'UPDATE agents SET status = COALESCE($1, status), current_task = COALESCE($2, current_task), updated_at = NOW() WHERE id = $3 RETURNING *',
    [status, current_task, req.params.id]
  );
  res.json(result.rows[0]);
});

// API: 新增任務
app.post('/api/tasks', postLimiter, async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${SSE_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { title, description, created_by, assigned_to, dispatched_by, department_id } = req.body;
  const result = await pool.query(
    `INSERT INTO tasks (title, description, status, created_by, assigned_to, dispatched_by, department_id)
     VALUES ($1, $2, 'assigned', $3, $4, $5, $6) RETURNING *`,
    [title, description, created_by, assigned_to, dispatched_by, department_id]
  );
  res.json(result.rows[0]);
});

// API: 新增流轉記錄
app.post('/api/flows', postLimiter, async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${SSE_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { task_id, from_agent_id, to_agent_id, action, note } = req.body;
  const result = await pool.query(
    'INSERT INTO task_flows (task_id, from_agent_id, to_agent_id, action, note) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [task_id, from_agent_id, to_agent_id, action, note]
  );
  res.json(result.rows[0]);
});

// === Skills API ===

// 掃描並列出所有 skills
app.get('/api/skills', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, description, version, path, 
             created_at, updated_at
      FROM skills
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

// 重新掃描 skills（手動觸發）
app.post('/api/skills/scan', postLimiter, async (req, res) => {
  try {
    const reader = new SkillReader();
    const skills = await reader.scanAllSkills();
    const count = await reader.saveToDatabase(pool, skills);
    
    res.json({ 
      ok: true, 
      scanned: count,
      skills: skills
    });
  } catch (error) {
    console.error('Scan skills error:', error);
    res.status(500).json({ error: 'Failed to scan skills' });
  }
});

// 取得特定 skill 詳細資訊
app.get('/api/skills/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM skills WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get skill error:', error);
    res.status(500).json({ error: 'Failed to get skill' });
  }
});

// === Agent Detection & Config API ===

// 設定頭像上傳目錄
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/assets/avatars/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const avatarUpload = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// 讀取 Clawdbot 設定檔（支援多種設定檔）
function readClawdbotConfig() {
  const configPaths = [
    path.join(process.env.HOME, '.openclawd/openclawd.json'),
    path.join(process.env.HOME, '.moltbot/moltbot.json'),
    path.join(process.env.HOME, '.clawdbot/clawdbot.json')
  ];
  
  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(content);
      } catch (e) {
        console.error(`Failed to read ${configPath}:`, e);
      }
    }
  }
  
  return null;
}

// 隨機分配頭像（從現有檔案中選擇）
function assignRandomAvatar() {
  const avatarsPath = path.join(__dirname, 'public/assets/agents');
  
  try {
    // 讀取所有頭像檔案
    const files = fs.readdirSync(avatarsPath)
      .filter(f => f.endsWith('.png'));
    
    if (files.length === 0) {
      // 如果沒有檔案，回傳預設頭像
      return '/assets/agents/default.png';
    }
    
    // 隨機選一個
    const randomFile = files[Math.floor(Math.random() * files.length)];
    return `/assets/agents/${randomFile}`;
  } catch (error) {
    console.error('Failed to assign random avatar:', error);
    return '/assets/agents/default.png';
  }
}

// 自動偵測 Clawdbot agents
app.post('/api/agents/detect', postLimiter, async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${SSE_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const config = readClawdbotConfig();
    const detector = new AgentDetector(pool);
    const agents = await detector.detectClawdbotAgents();
    
    // 為每個 agent 補充設定檔資訊和隨機頭像
    if (config && config.agents && config.agents.list) {
      agents.forEach(agent => {
        const configAgent = config.agents.list.find(a => a.id === agent.id);
        if (configAgent) {
          agent.name = configAgent.name || agent.name;
        }
        
        // 隨機分配頭像（如果沒有設定）
        if (!agent.avatar_url) {
          agent.avatar_url = assignRandomAvatar(agent.id);
        }
      });
    }
    
    const results = await detector.syncToDatabase(agents);
    
    res.json({ 
      ok: true, 
      detected: agents.length,
      created: results.created,
      updated: results.updated,
      skills_synced: results.skills_synced,
      agents: agents
    });
  } catch (error) {
    console.error('Detect agents error:', error);
    res.status(500).json({ error: 'Failed to detect agents', message: error.message });
  }
});

// 取得 Clawdbot 設定檔
app.get('/api/clawdbot/config', async (req, res) => {
  try {
    const config = readClawdbotConfig();
    
    if (!config) {
      return res.status(404).json({ error: 'Clawdbot config not found' });
    }
    
    // 只回傳 agents 列表資訊（不要暴露敏感資訊）
    const agentsList = config.agents && config.agents.list ? config.agents.list : [];
    
    res.json({ 
      agents: agentsList.map(a => ({
        id: a.id,
        name: a.name,
        workspace: a.workspace
      }))
    });
  } catch (error) {
    console.error('Get clawdbot config error:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// 取得已偵測的 agents（包含偵測資訊）
// 更新 agent 設定（名字、職稱、說明）
app.patch('/api/agents/:id/config', async (req, res) => {
  const { name, title, description, avatar_url } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE agents 
       SET name = COALESCE($1, name),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           avatar_url = COALESCE($4, avatar_url),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, title, description, avatar_url, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '員工不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update agent config error:', error);
    res.status(500).json({ error: 'Failed to update agent config' });
  }
});

// 上傳 agent 頭像
app.post('/api/agents/:id/avatar', avatarUpload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const avatarPath = `/assets/avatars/${req.file.filename}`;
  
  try {
    const result = await pool.query(
      'UPDATE agents SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [avatarPath, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '員工不存在' });
    }
    
    res.json({ ok: true, avatarPath: avatarPath, agent: result.rows[0] });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// 取得 agent 的 skills 列表
app.get('/api/agents/:id/skills', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*
      FROM skills s
      INNER JOIN agent_skills as2 ON s.id = as2.skill_id
      WHERE as2.agent_id = $1
      ORDER BY s.name
    `, [req.params.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get agent skills error:', error);
    res.status(500).json({ error: 'Failed to get agent skills' });
  }
});

// === Security / Port Scan API ===

// 取得安全設定
app.get('/api/security/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM security_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (error) {
    console.error('Get security settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// 更新安全設定
app.post('/api/security/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    
    await pool.query(
      `INSERT INTO security_settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value]
    );
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// 執行 Port 掃描
app.post('/api/security/scan', async (req, res) => {
  try {
    const scanner = new PortScanner();
    const result = await scanner.scan();
    await scanner.saveResult(pool, result);
    
    res.json(result);
  } catch (error) {
    console.error('Port scan error:', error);
    res.status(500).json({ error: 'Failed to scan ports' });
  }
});

// 取得最近一次掃描結果
app.get('/api/security/scan/latest', async (req, res) => {
  try {
    const scanner = new PortScanner();
    const results = await scanner.getLastResult(pool);
    
    res.json({ results });
  } catch (error) {
    console.error('Get scan results error:', error);
    res.status(500).json({ error: 'Failed to get scan results' });
  }
});

// 取得掃描歷史記錄
app.get('/api/security/scan/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const result = await pool.query(
      `SELECT * FROM port_scan_results 
       ORDER BY scanned_at DESC 
       LIMIT $1`,
      [limit]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get scan history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// === Prompt Guard API ===

// 取得 Prompt Guard 統計
app.get('/api/security/prompt-guard/stats', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const guard = new PromptGuard();
    const stats = await guard.getStats(pool, hours);
    
    res.json(stats);
  } catch (error) {
    console.error('Get prompt guard stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// 取得最近的審查記錄
app.get('/api/security/prompt-guard/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const guard = new PromptGuard();
    const logs = await guard.getRecentLogs(pool, limit);
    
    res.json(logs);
  } catch (error) {
    console.error('Get prompt guard logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// 測試單個 prompt（開發用）
app.post('/api/security/prompt-guard/test', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'ANTHROPIC_API_KEY not configured' 
      });
    }
    
    const guard = new PromptGuard(apiKey);
    const result = await guard.check(prompt);
    
    res.json(result);
  } catch (error) {
    console.error('Test prompt error:', error);
    res.status(500).json({ error: 'Failed to test prompt' });
  }
});

// === Animation SSE ===
const sseClients = [];
const animationQueue = [];

app.get('/api/animation/stream', (req, res) => {
  const token = req.query.token;
  if (!token || token !== SSE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', () => { const i = sseClients.indexOf(res); if (i >= 0) sseClients.splice(i, 1); });
});

app.post('/api/animation', postLimiter, (req, res) => {
  // 支援 token 從 header 或 query parameter
  const auth = req.headers.authorization;
  const tokenFromHeader = auth ? auth.replace('Bearer ', '') : null;
  const tokenFromQuery = req.query.token;
  const token = tokenFromHeader || tokenFromQuery;
  
  if (!token || token !== SSE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const event = { type: req.body.type || 'message_received', from: req.body.from || 'kevin', to: req.body.to, text: req.body.text || '', timestamp: new Date().toISOString() };
  animationQueue.push(event);
  while (animationQueue.length > 50) animationQueue.shift();
  sseClients.forEach(client => { try { client.write(`data: ${JSON.stringify(event)}\n\n`); } catch(e) {} });
  res.json({ ok: true });
});

app.get('/api/animation/queue', (req, res) => {
  res.json({ ok: true, events: animationQueue.slice(-20) });
});

// === KIE.ai 圖片生成 API ===
app.post('/api/generate-avatar', async (req, res) => {
  const { agentId, prompt } = req.body;
  
  if (!agentId || !prompt) {
    return res.status(400).json({ error: 'Missing agentId or prompt' });
  }
  
  const kieApiKey = process.env.KIE_AI_API_KEY;
  
  if (!kieApiKey) {
    return res.status(400).json({ 
      error: 'KIE_AI_API_KEY not configured. Using default avatars.' 
    });
  }
  
  try {
    // KIE.ai API 整合（範例）
    const response = await fetch('https://api.kie.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        size: '256x256'
      })
    });
    
    if (!response.ok) {
      throw new Error('KIE.ai API failed');
    }
    
    const data = await response.json();
    const imageUrl = data.url;
    
    // 更新資料庫中的 avatar_url
    await pool.query(
      'UPDATE agents SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [imageUrl, agentId]
    );
    
    res.json({ ok: true, imageUrl });
  } catch (error) {
    console.error('KIE.ai generate error:', error);
    res.status(500).json({ error: 'Failed to generate avatar' });
  }
});

// ========================================
// Memory 編輯器 API
// ========================================

// 列出 Agent 的 memory 檔案
app.get('/api/agents/:id/memory', async (req, res) => {
  try {
    const agentId = req.params.id;
    const agent = await pool.query(
      'SELECT clawdbot_agent_id FROM agents WHERE id = $1',
      [agentId]
    );
    
    if (agent.rows.length === 0) {
      return res.status(404).json({ error: '員工不存在' });
    }
    
    const clawdbotAgentId = agent.rows[0].clawdbot_agent_id;
    
    // 如果 agent 沒有關聯的 clawdbot agent，回傳空陣列
    if (!clawdbotAgentId) {
      return res.json({ files: [] });
    }
    
    const memoryPath = path.join(
      process.env.HOME,
      '.clawdbot/agents',
      clawdbotAgentId,
      'memory'
    );
    
    // 如果 memory 資料夾不存在，回傳空陣列（不是 404）
    if (!fs.existsSync(memoryPath)) {
      return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(memoryPath)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const stats = fs.statSync(path.join(memoryPath, f));
        return {
          name: f,
          path: path.join(memoryPath, f),
          size: stats.size,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.modified - a.modified); // 最新的在前面
    
    res.json({ files });
  } catch (error) {
    console.error('Get memory files error:', error);
    // 即使出錯也回傳空陣列，不要讓前端炸掉
    res.json({ files: [], error: error.message });
  }
});

// 讀取 memory 檔案內容
app.get('/api/agents/:id/memory/:filename', async (req, res) => {
  try {
    const agentId = req.params.id;
    const filename = req.params.filename;
    
    const agent = await pool.query(
      'SELECT clawdbot_agent_id FROM agents WHERE id = $1',
      [agentId]
    );
    
    if (agent.rows.length === 0) {
      return res.status(404).json({ error: '員工不存在' });
    }
    
    const clawdbotAgentId = agent.rows[0].clawdbot_agent_id;
    const filePath = path.join(
      process.env.HOME,
      '.clawdbot/agents',
      clawdbotAgentId,
      'memory',
      filename
    );
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content, filename });
  } catch (error) {
    console.error('Read memory file error:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// 更新 memory 檔案內容
app.put('/api/agents/:id/memory/:filename', async (req, res) => {
  try {
    const agentId = req.params.id;
    const filename = req.params.filename;
    const { content } = req.body;
    
    const agent = await pool.query(
      'SELECT clawdbot_agent_id FROM agents WHERE id = $1',
      [agentId]
    );
    
    if (agent.rows.length === 0) {
      return res.status(404).json({ error: '員工不存在' });
    }
    
    const clawdbotAgentId = agent.rows[0].clawdbot_agent_id;
    const filePath = path.join(
      process.env.HOME,
      '.clawdbot/agents',
      clawdbotAgentId,
      'memory',
      filename
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    res.json({ ok: true });
  } catch (error) {
    console.error('Update memory file error:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// 新增/上傳 memory 檔案
app.post('/api/agents/:id/memory', async (req, res) => {
  try {
    const agentId = req.params.id;
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content required' });
    }
    
    // 檔名安全檢查
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const agent = await pool.query(
      'SELECT clawdbot_agent_id FROM agents WHERE id = $1',
      [agentId]
    );
    
    if (agent.rows.length === 0) {
      return res.status(404).json({ error: '員工不存在' });
    }
    
    const clawdbotAgentId = agent.rows[0].clawdbot_agent_id;
    const memoryDir = path.join(
      process.env.HOME,
      '.clawdbot/agents',
      clawdbotAgentId,
      'memory'
    );
    
    // 確保 memory 目錄存在
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }
    
    const filePath = path.join(memoryDir, filename);
    
    // 檢查檔案是否已存在
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ error: 'File already exists, use PUT to update' });
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    res.json({ ok: true, filename });
  } catch (error) {
    console.error('Create memory file error:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

// ========================================
// 下載功能 API
// ========================================

// 下載 Agent workspace
app.get('/api/agents/:id/download', async (req, res) => {
  try {
    const agentId = req.params.id;
    const agent = await pool.query(
      'SELECT clawdbot_agent_id, name FROM agents WHERE id = $1',
      [agentId]
    );
    
    if (agent.rows.length === 0) {
      return res.status(404).json({ error: '員工不存在' });
    }
    
    const clawdbotAgentId = agent.rows[0].clawdbot_agent_id;
    const agentName = agent.rows[0].name;
    
    if (!clawdbotAgentId) {
      return res.status(400).json({ error: '此員工沒有關聯到 Clawdbot Agent，無法下載' });
    }
    
    const workspacePath = path.join(
      process.env.HOME,
      '.clawdbot/agents',
      clawdbotAgentId
    );
    
    if (!fs.existsSync(workspacePath)) {
      return res.status(404).json({ error: '找不到 Agent 的 workspace 資料夾' });
    }
    
    res.setHeader('Content-Type', 'application/zip');
    // 使用 ASCII safe filename 和 UTF-8 編碼的 filename* (RFC 5987)
    const safeFilename = `${clawdbotAgentId}-workspace.zip`;
    const encodedName = encodeURIComponent(agentName || clawdbotAgentId);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedName}-workspace.zip`);
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create archive' });
    });
    
    archive.pipe(res);
    archive.directory(workspacePath, false);
    await archive.finalize();
  } catch (error) {
    console.error('Download workspace error:', error);
    res.status(500).json({ error: 'Failed to download' });
  }
});

// 下載 Skill
app.get('/api/skills/:id/download', async (req, res) => {
  try {
    const skillId = req.params.id;
    const skill = await pool.query(
      'SELECT name, slug, path FROM skills WHERE id = $1',
      [skillId]
    );
    
    if (skill.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    const skillPath = skill.rows[0].path;
    const skillName = skill.rows[0].slug || skill.rows[0].name;
    
    if (!fs.existsSync(skillPath)) {
      return res.status(404).json({ error: 'Skill path not found' });
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${skillName}.zip"`);
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create archive' });
    });
    
    archive.pipe(res);
    archive.directory(skillPath, false);
    await archive.finalize();
  } catch (error) {
    console.error('Download skill error:', error);
    res.status(500).json({ error: 'Failed to download' });
  }
});

// SSE 心跳
setInterval(() => {
  sseClients.forEach(client => {
    try {
      client.write(': heartbeat\n\n');
    } catch (e) {}
  });
}, 30000);

const PORT = 3210;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🏢 Virtual Office running at http://127.0.0.1:${PORT}`);
});

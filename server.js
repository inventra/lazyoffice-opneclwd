const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  database: 'virtual_office',
  host: 'localhost',
  port: 5432,
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
app.post('/api/tasks', async (req, res) => {
  const { title, description, created_by, assigned_to, dispatched_by, department_id } = req.body;
  const result = await pool.query(
    `INSERT INTO tasks (title, description, status, created_by, assigned_to, dispatched_by, department_id)
     VALUES ($1, $2, 'assigned', $3, $4, $5, $6) RETURNING *`,
    [title, description, created_by, assigned_to, dispatched_by, department_id]
  );
  res.json(result.rows[0]);
});

// API: 新增流轉記錄
app.post('/api/flows', async (req, res) => {
  const { task_id, from_agent_id, to_agent_id, action, note } = req.body;
  const result = await pool.query(
    'INSERT INTO task_flows (task_id, from_agent_id, to_agent_id, action, note) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [task_id, from_agent_id, to_agent_id, action, note]
  );
  res.json(result.rows[0]);
});

const PORT = 3210;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏢 Virtual Office running at http://localhost:${PORT}`);
});

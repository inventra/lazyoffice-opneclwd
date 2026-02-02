const API = '';

let departments = [];
let agents = [];
let tasks = [];
let flows = [];

async function fetchData() {
  [departments, agents, tasks, flows] = await Promise.all([
    fetch(`${API}/api/departments`).then(r => r.json()),
    fetch(`${API}/api/agents`).then(r => r.json()),
    fetch(`${API}/api/tasks`).then(r => r.json()),
    fetch(`${API}/api/flows`).then(r => r.json()),
  ]);
}

function renderOffice() {
  const map = document.getElementById('office-map');
  map.innerHTML = '';

  departments.forEach(dept => {
    const room = document.createElement('div');
    room.className = 'room';
    room.style.left = dept.position_x + 'px';
    room.style.top = dept.position_y + 'px';
    room.style.width = dept.width + 'px';
    room.style.minHeight = dept.height + 'px';
    room.id = `room-${dept.id}`;

    const deptAgents = agents.filter(a => a.department_id === dept.id);

    room.innerHTML = `
      <div class="room-header">${dept.emoji} ${dept.label}</div>
      <div class="room-body">
        ${deptAgents.map(a => `
          <div class="agent-card" data-agent-id="${a.id}" title="${a.role}${a.telegram_bot ? '\n' + a.telegram_bot : ''}">
            <div class="agent-status dot ${a.status}"></div>
            <div class="agent-avatar">${a.avatar_emoji}</div>
            <div class="agent-name">${a.name}</div>
            <div class="agent-role">${a.role}</div>
            ${a.current_task ? `<div class="agent-task-badge">${a.current_task}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    map.appendChild(room);
  });
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const statusMap = {
    pending: '待處理',
    assigned: '已分派',
    in_progress: '進行中',
    review: '審核中',
    done: '完成',
  };

  list.innerHTML = tasks.map(t => `
    <div class="task-card ${t.status}">
      <div class="task-title">${t.title}</div>
      <div class="task-meta">
        👤 ${t.creator_name || '—'} → 📋 ${t.dispatcher_name || '—'} → 🎯 ${t.assignee_name || '—'}
      </div>
      <span class="task-status-badge ${t.status}">${statusMap[t.status] || t.status}</span>
    </div>
  `).join('');
}

function renderFlows() {
  const list = document.getElementById('flow-list');
  const actionMap = {
    dispatch: '📤 下達',
    assign: '📋 分派',
    complete: '✅ 完成',
    review: '🔍 審核',
  };

  list.innerHTML = flows.map(f => `
    <div class="flow-item">
      <span>${f.from_name}</span>
      <span class="flow-arrow">→</span>
      <span>${f.to_name}</span>
      <span class="flow-action">${actionMap[f.action] || f.action} | ${f.task_title}</span>
    </div>
  `).join('');
}

function renderFlowLines() {
  const svg = document.getElementById('flow-lines');
  svg.innerHTML = '';

  // Get agent positions from rendered cards
  const getAgentPos = (agentId) => {
    const card = document.querySelector(`[data-agent-id="${agentId}"]`);
    if (!card) return null;
    const rect = card.getBoundingClientRect();
    const container = document.querySelector('.office-container').getBoundingClientRect();
    return {
      x: rect.left - container.left + rect.width / 2,
      y: rect.top - container.top + rect.height / 2,
    };
  };

  // Draw flow lines for active tasks
  const activeFlows = flows.filter(f => {
    const task = tasks.find(t => t.id === f.task_id);
    return task && task.status === 'in_progress';
  });

  activeFlows.forEach((f, i) => {
    const from = getAgentPos(f.from_agent_id);
    const to = getAgentPos(f.to_agent_id);
    if (!from || !to) return;

    // Curved path
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2 - 30;
    const pathD = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('class', 'flow-line active');
    path.setAttribute('id', `flow-path-${i}`);
    svg.appendChild(path);

    // Animated dot along the path
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'flow-dot active');
    circle.setAttribute('r', '5');

    const animateMotion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
    animateMotion.setAttribute('dur', '2s');
    animateMotion.setAttribute('repeatCount', 'indefinite');
    animateMotion.setAttribute('path', pathD);
    circle.appendChild(animateMotion);
    svg.appendChild(circle);
  });

  // Draw all historical flows (dimmer)
  const historicalFlows = flows.filter(f => {
    const task = tasks.find(t => t.id === f.task_id);
    return task && task.status !== 'in_progress';
  });

  historicalFlows.forEach((f) => {
    const from = getAgentPos(f.from_agent_id);
    const to = getAgentPos(f.to_agent_id);
    if (!from || !to) return;

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2 - 20;
    const pathD = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('class', 'flow-line');
    svg.appendChild(path);
  });
}

async function init() {
  await fetchData();
  renderOffice();
  renderTasks();
  renderFlows();

  // Delay flow lines to ensure DOM is rendered
  requestAnimationFrame(() => {
    renderFlowLines();
  });

  // Auto refresh every 10s
  setInterval(async () => {
    await fetchData();
    renderOffice();
    renderTasks();
    renderFlows();
    requestAnimationFrame(() => renderFlowLines());
  }, 10000);
}

init();

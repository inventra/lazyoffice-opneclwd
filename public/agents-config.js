let SSE_TOKEN = localStorage.getItem('sse_token') || '';

// 初始化：從後端取得 SSE Token
async function initToken() {
  if (!SSE_TOKEN) {
    try {
      const response = await fetch('/api/token');
      if (response.ok) {
        const data = await response.json();
        SSE_TOKEN = data.token;
        localStorage.setItem('sse_token', SSE_TOKEN);
        console.log('✅ SSE Token initialized');
      }
    } catch (error) {
      console.error('❌ Failed to get SSE token:', error);
    }
  }
}

// 頁面載入時初始化 token
initToken();

// 顯示訊息
function showMessage(text, type = 'success') {
  const messageDiv = document.getElementById('message');
  messageDiv.className = type;
  messageDiv.textContent = text;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

// 載入已偵測的 agents
async function loadAgents() {
  const container = document.getElementById('agentsContainer');
  
  try {
    const response = await fetch('/api/agents/detected');
    
    if (!response.ok) {
      throw new Error('Failed to load agents');
    }
    
    const agents = await response.json();
    
    if (agents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🤖</div>
          <p>尚未偵測到任何 Clawdbot Agents</p>
          <p>請點擊上方的「自動偵測」按鈕</p>
        </div>
      `;
      return;
    }
    
    // 渲染 agents 卡片
    container.innerHTML = `
      <div class="agents-grid">
        ${agents.map(agent => renderAgentCard(agent)).join('')}
      </div>
    `;
    
    // 確保 DOM 更新後再綁定事件
    setTimeout(() => {
      agents.forEach(agent => {
        bindAgentEvents(agent);
      });
    }, 0);
    
  } catch (error) {
    console.error('Load agents error:', error);
    container.innerHTML = `
      <div class="error">
        載入失敗：${error.message}
      </div>
    `;
  }
}

// 渲染單個 agent 卡片
function renderAgentCard(agent) {
  const avatarUrl = agent.avatar_url || '/assets/avatars/default-avatar.png';
  const skills = agent.skills_count > 0 ? `${agent.skills_count} 個 skills` : '尚未偵測到 skills';
  
  return `
    <div class="agent-card" data-agent-id="${agent.id}">
      <div class="agent-header">
        <img src="${avatarUrl}" alt="${agent.name}" class="agent-avatar" id="avatar-${agent.id}">
        <div class="agent-info">
          <div class="agent-id">ID: ${agent.clawdbot_agent_id || agent.id}</div>
          <div><strong>${agent.name}</strong></div>
        </div>
      </div>
      
      <div class="form-group">
        <label>名字</label>
        <input type="text" id="name-${agent.id}" value="${agent.name || ''}" placeholder="輸入 Agent 名字">
      </div>
      
      <div class="form-group">
        <label>職稱</label>
        <input type="text" id="title-${agent.id}" value="${agent.title || ''}" placeholder="例如：助理、工程師">
      </div>
      
      <div class="form-group">
        <label>說明</label>
        <textarea id="description-${agent.id}" placeholder="描述這個員工的功能">${agent.description || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label>🎯 技能</label>
        <div class="skills-tags" id="skills-${agent.id}">
          <span class="skill-tag">${skills}</span>
        </div>
      </div>
      
      <div class="avatar-upload-section">
        <button class="avatar-upload-btn" id="avatar-select-${agent.id}">
          🎨 選擇頭像
        </button>
      </div>
      
      <div style="display: flex; gap: 8px; margin-bottom: 10px;">
        <button class="action-button memory-btn" id="memory-${agent.id}" style="flex: 1;">
          📝 Memory
        </button>
        <button class="action-button download-btn" id="download-${agent.id}" style="flex: 1;">
          💾 下載
        </button>
      </div>
      
      <button class="save-button" id="save-${agent.id}">
        💾 儲存設定
      </button>
    </div>
  `;
}

// 綁定 agent 相關事件
function bindAgentEvents(agent) {
  const agentId = agent.id;
  
  // 儲存按鈕
  const saveButton = document.getElementById(`save-${agentId}`);
  if (saveButton) {
    saveButton.addEventListener('click', () => saveAgentConfig(agentId));
  }
  
  // 頭像選擇按鈕
  const avatarSelectBtn = document.getElementById(`avatar-select-${agentId}`);
  if (avatarSelectBtn) {
    avatarSelectBtn.addEventListener('click', () => openAvatarSelector(agentId));
  }
  
  // Memory 按鈕
  const memoryButton = document.getElementById(`memory-${agentId}`);
  if (memoryButton) {
    memoryButton.addEventListener('click', () => openMemoryModal(agentId, agent.name));
  }
  
  // 下載按鈕
  const downloadButton = document.getElementById(`download-${agentId}`);
  if (downloadButton) {
    downloadButton.addEventListener('click', () => downloadAgent(agentId, agent.name));
  }
  
  // 載入 skills（非同步）
  loadAgentSkills(agentId);
}

// 載入 agent 的 skills
async function loadAgentSkills(agentId) {
  try {
    const response = await fetch(`/api/agents/${agentId}/skills`);
    
    if (!response.ok) {
      return;
    }
    
    const skills = await response.json();
    const skillsContainer = document.getElementById(`skills-${agentId}`);
    
    if (!skillsContainer) return;
    
    if (skills.length === 0) {
      skillsContainer.innerHTML = '<span class="skill-tag">尚未偵測到 skills</span>';
      return;
    }
    
    skillsContainer.innerHTML = skills.map(skill => 
      `<span class="skill-tag">${skill.name}</span>`
    ).join('');
    
  } catch (error) {
    console.error(`Load skills for ${agentId} error:`, error);
  }
}

// 儲存 agent 設定
async function saveAgentConfig(agentId) {
  const nameInput = document.getElementById(`name-${agentId}`);
  const titleInput = document.getElementById(`title-${agentId}`);
  const descriptionInput = document.getElementById(`description-${agentId}`);
  const saveButton = document.getElementById(`save-${agentId}`);
  
  const data = {
    name: nameInput.value,
    title: titleInput.value,
    description: descriptionInput.value
  };
  
  saveButton.disabled = true;
  saveButton.textContent = '儲存中...';
  
  try {
    const response = await fetch(`/api/agents/${agentId}/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save config');
    }
    
    const result = await response.json();
    
    showMessage(`✅ ${result.name} 的設定已儲存`, 'success');
    saveButton.textContent = '✅ 已儲存';
    
    setTimeout(() => {
      saveButton.textContent = '💾 儲存設定';
      saveButton.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Save config error:', error);
    showMessage(`❌ 儲存失敗：${error.message}`, 'error');
    
    saveButton.textContent = '💾 儲存設定';
    saveButton.disabled = false;
  }
}

// 可用的頭像列表
const AVAILABLE_AVATARS = [
  '/assets/agents/alex_ne.png',
  '/assets/agents/alex_nw.png',
  '/assets/agents/alex_se.png',
  '/assets/agents/alex_sw.png',
  '/assets/agents/kevin_ne.png',
  '/assets/agents/kevin_nw.png',
  '/assets/agents/kevin_se.png',
  '/assets/agents/kevin_sw.png',
  '/assets/agents/lena_ne.png',
  '/assets/agents/lena_nw.png',
  '/assets/agents/lena_se.png',
  '/assets/agents/lena_sw.png',
  '/assets/agents/n8n_bot_ne.png',
  '/assets/agents/n8n_bot_nw.png',
  '/assets/agents/n8n_bot_se.png',
  '/assets/agents/n8n_bot_sw.png',
  '/assets/agents/writer_ne.png',
  '/assets/agents/writer_nw.png',
  '/assets/agents/writer_se.png',
  '/assets/agents/writer_sw.png'
];

// 打開頭像選擇器
function openAvatarSelector(agentId) {
  // 建立 modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 10px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  modalContent.innerHTML = `
    <h3 style="margin-top: 0;">選擇頭像</h3>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
      ${AVAILABLE_AVATARS.map(avatar => `
        <div style="cursor: pointer; text-align: center; padding: 10px; border: 2px solid #ddd; border-radius: 8px; transition: all 0.2s;"
             onmouseover="this.style.borderColor='#4CAF50'; this.style.transform='scale(1.05)'"
             onmouseout="this.style.borderColor='#ddd'; this.style.transform='scale(1)'"
             onclick="selectAvatar(${agentId}, '${avatar}'); this.closest('.modal').remove();">
          <img src="${avatar}" style="width: 80px; height: 80px; border-radius: 50%;">
          <div style="font-size: 11px; margin-top: 5px; color: #666;">${avatar.split('/').pop().replace('.png', '')}</div>
        </div>
      `).join('')}
    </div>
    <button onclick="this.closest('.modal').remove()" style="width: 100%; padding: 10px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">
      取消
    </button>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // 點擊背景關閉
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// 選擇頭像
async function selectAvatar(agentId, avatarUrl) {
  const avatarImg = document.getElementById(`avatar-${agentId}`);
  
  try {
    const response = await fetch(`/api/agents/${agentId}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: avatarUrl })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update avatar');
    }
    
    // 更新頭像顯示
    if (avatarImg) {
      avatarImg.src = avatarUrl + '?t=' + Date.now();
    }
    
    showMessage('✅ 頭像更新成功', 'success');
    
  } catch (error) {
    console.error('Select avatar error:', error);
    showMessage(`❌ 更新失敗：${error.message}`, 'error');
  }
}

// 自動偵測 agents
async function detectAgents() {
  const button = document.getElementById('detectButton');
  const status = document.getElementById('detectStatus');
  
  button.disabled = true;
  button.textContent = '偵測中...';
  status.textContent = '正在掃描 ~/.clawdbot/agents/ 目錄...';
  
  try {
    // 確保 token 已載入
    await initToken();
    
    if (!SSE_TOKEN) {
      throw new Error('無法取得 SSE Token，請重新整理頁面');
    }
    
    const response = await fetch('/api/agents/detect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SSE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Detection failed');
    }
    
    const result = await response.json();
    
    status.textContent = `✅ 偵測完成！找到 ${result.detected} 個 Agents（新增 ${result.created} 個，更新 ${result.updated} 個，同步 ${result.skills_synced} 個 skills）`;
    
    showMessage(`✅ 成功偵測 ${result.detected} 個員工`, 'success');
    
    // 重新載入列表
    setTimeout(() => {
      loadAgents();
    }, 1000);
    
  } catch (error) {
    console.error('Detect agents error:', error);
    status.textContent = `❌ 偵測失敗：${error.message}`;
    showMessage(`❌ 偵測失敗：${error.message}`, 'error');
  } finally {
    button.disabled = false;
    button.textContent = '🔍 自動偵測 Clawdbot Agents';
  }
}

// 開啟 Memory Modal
async function openMemoryModal(agentId, agentName) {
  try {
    const response = await fetch(`/api/agents/${agentId}/memory`);
    
    if (!response.ok) {
      throw new Error('Failed to load memory files');
    }
    
    const data = await response.json();
    const files = data.files || [];
    
    // 建立 modal
    const modal = document.createElement('div');
    modal.id = 'memory-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    modal.innerHTML = `
      <div style="background: #1a1a2e; border-radius: 12px; padding: 30px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #e8d5b7;">📝 ${agentName} 的 Memory</h2>
          <button onclick="closeMemoryModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #e8d5b7;">✕</button>
        </div>
        
        ${files.length === 0 ? 
          '<p style="color: #999; text-align: center; padding: 40px;">尚無 memory 檔案</p>' :
          `<div style="display: flex; flex-direction: column; gap: 10px;">
            ${files.map(file => `
              <div style="border: 1px solid #2a3a5c; background: #0d1525; border-radius: 8px; padding: 15px; cursor: pointer; transition: background 0.2s;"
                   onmouseover="this.style.background='#16213e'; this.style.borderColor='#3a5a8c'"
                   onmouseout="this.style.background='#0d1525'; this.style.borderColor='#2a3a5c'"
                   onclick="viewMemoryFile(${agentId}, '${agentName}', '${file.name}')">
                <div style="font-weight: 500; margin-bottom: 5px; color: #e8d5b7;">📄 ${file.name}</div>
                <div style="font-size: 12px; color: #99aabb;">
                  ${(file.size / 1024).toFixed(1)} KB · 修改於 ${new Date(file.modified).toLocaleString('zh-TW')}
                </div>
              </div>
            `).join('')}
          </div>`
        }
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Open memory modal error:', error);
    showMessage(`❌ 載入失敗：${error.message}`, 'error');
  }
}

// 關閉 Memory Modal
function closeMemoryModal() {
  const modal = document.getElementById('memory-modal');
  if (modal) {
    modal.remove();
  }
  
  const editorModal = document.getElementById('memory-editor-modal');
  if (editorModal) {
    editorModal.remove();
  }
}

// 開啟 Memory 編輯器
async function openMemoryEditor(agentId, agentName, filename) {
  try {
    const response = await fetch(`/api/agents/${agentId}/memory/${encodeURIComponent(filename)}`);
    
    if (!response.ok) {
      throw new Error('Failed to load file');
    }
    
    const data = await response.json();
    
    // 建立編輯器 modal
    const modal = document.createElement('div');
    modal.id = 'memory-editor-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
    `;
    
    modal.innerHTML = `
      <div style="background: #1a1a2e; border-radius: 12px; padding: 30px; max-width: 900px; width: 90%; max-height: 90vh; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #e8d5b7;">✏️ 編輯：${filename}</h2>
          <button onclick="closeMemoryModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #e8d5b7;">✕</button>
        </div>
        
        <textarea id="memory-content" style="
          flex: 1;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 13px;
          padding: 15px;
          border: 1px solid #2a3a5c;
          border-radius: 6px;
          resize: none;
          margin-bottom: 15px;
          background: #0d1525;
          color: #e8d5b7;
        ">${data.content}</textarea>
        
        <div style="display: flex; gap: 10px;">
          <button onclick="saveMemoryFile(${agentId}, '${filename}')" style="
            flex: 1;
            padding: 12px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
          ">💾 儲存</button>
          
          <button onclick="closeMemoryModal()" style="
            padding: 12px 24px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
          ">取消</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Open memory editor error:', error);
    showMessage(`❌ 載入失敗：${error.message}`, 'error');
  }
}

// 儲存 Memory 檔案
async function saveMemoryFile(agentId, filename) {
  const content = document.getElementById('memory-content').value;
  
  try {
    const response = await fetch(`/api/agents/${agentId}/memory/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save file');
    }
    
    showMessage(`✅ ${filename} 已儲存`, 'success');
    closeMemoryModal();
    
  } catch (error) {
    console.error('Save memory file error:', error);
    showMessage(`❌ 儲存失敗：${error.message}`, 'error');
  }
}

// 下載 Agent Workspace
async function downloadAgent(agentId, agentName) {
  try {
    const response = await fetch(`/api/agents/${agentId}/download`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    // 正確的 blob 下載方式
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agentName}-workspace.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage(`✅ ${agentName} workspace 下載完成`, 'success');
    
  } catch (error) {
    console.error('Download agent error:', error);
    showMessage(`❌ 下載失敗：${error.message}`, 'error');
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadAgents();
  
  const detectButton = document.getElementById('detectButton');
  if (detectButton) {
    detectButton.addEventListener('click', detectAgents);
  }
});

// 新增 Memory 檔案
async function createNewMemory(agentId, agentName) {
  const filename = prompt("請輸入檔案名稱（例如：2026-02-07-note.md）：");
  
  if (!filename) return;
  
  if (!filename.endsWith(".md")) {
    showMessage("❌ 檔名必須以 .md 結尾", "error");
    return;
  }
  
  try {
    const response = await fetch(`/api/agents/${agentId}/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: filename,
        content: `# ${filename}

建立於 ${new Date().toLocaleString("zh-TW")}

`
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create file");
    }
    
    showMessage(`✅ 檔案 ${filename} 已建立`, "success");
    
    // 關閉當前 modal 並重新開啟（顯示新檔案）
    closeMemoryModal();
    setTimeout(() => openMemoryModal(agentId, agentName), 500);
    
  } catch (error) {
    console.error("Create memory error:", error);
    showMessage(`❌ 建立失敗：${error.message}`, "error");
  }
}


// 查看 Memory 檔案（閱讀模式）
async function viewMemoryFile(agentId, agentName, filename) {
  try {
    const response = await fetch(`/api/agents/${agentId}/memory/${encodeURIComponent(filename)}`);
    
    if (!response.ok) {
      throw new Error('Failed to load file');
    }
    
    const data = await response.json();
    
    // 建立查看 modal
    const modal = document.createElement('div');
    modal.id = 'memory-viewer-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
    `;
    
    modal.innerHTML = `
      <div style="background: #1a1a2e; border-radius: 12px; padding: 30px; max-width: 800px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #e8d5b7;">📄 ${filename}</h2>
          <div style="display: flex; gap: 10px;">
            <button onclick="editMemoryFile(${agentId}, '${agentName}', '${filename}')" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer;">✏️ 編輯</button>
            <button onclick="closeViewerModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #e8d5b7;">✕</button>
          </div>
        </div>
        
        <div style="flex: 1; overflow-y: auto; border: 1px solid #2a3a5c; border-radius: 8px; padding: 20px; background: #0d1525; color: #e8d5b7; white-space: pre-wrap; font-family: monospace; font-size: 14px; line-height: 1.6;">
${data.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('View memory file error:', error);
    showMessage(`❌ 載入失敗：${error.message}`, 'error');
  }
}

// 關閉查看 Modal
function closeViewerModal() {
  const modal = document.getElementById('memory-viewer-modal');
  if (modal) {
    modal.remove();
  }
}

// 從查看模式進入編輯模式
function editMemoryFile(agentId, agentName, filename) {
  closeViewerModal();
  openMemoryEditor(agentId, agentName, filename);
}

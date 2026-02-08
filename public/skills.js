let allSkills = []; // 儲存所有 skills

async function loadSkills() {
  try {
    const response = await fetch('/api/skills');
    allSkills = await response.json();
    
    document.getElementById('total-skills').textContent = allSkills.length;
    
    renderSkills(allSkills);
  } catch (error) {
    console.error('Failed to load skills:', error);
    document.getElementById('skills-list').innerHTML = 
      '<div class="loading">❌ 載入失敗：' + error.message + '</div>';
  }
}

function renderSkills(skills) {
  const container = document.getElementById('skills-list');
  
  if (skills.length === 0) {
    container.innerHTML = '<div class="loading">沒有找到符合的 skills</div>';
    return;
  }
  
  container.className = 'skills-grid';
  container.innerHTML = skills.map(skill => `
      <div class="skill-card">
        <div class="skill-name">${escapeHtml(skill.name)}</div>
        <div class="skill-version">v${escapeHtml(skill.version)}</div>
        <div class="skill-description">${escapeHtml(skill.description)}</div>
        <div class="skill-path">${escapeHtml(skill.path)}</div>
        <button onclick="downloadSkill(${skill.id}, '${escapeHtml(skill.name)}')" style="
          margin-top: 10px;
          padding: 8px 16px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
        ">💾 下載 Skill</button>
      </div>
    `).join('');
}

// 搜尋功能
function searchSkills() {
  const query = document.getElementById('skill-search').value.toLowerCase().trim();
  
  if (!query) {
    renderSkills(allSkills);
    return;
  }
  
  const filtered = allSkills.filter(skill => 
    skill.name.toLowerCase().includes(query) ||
    (skill.description && skill.description.toLowerCase().includes(query)) ||
    (skill.path && skill.path.toLowerCase().includes(query))
  );
  
  renderSkills(filtered);
}

async function scanSkills() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '🔄 掃描中...';
  
  try {
    const response = await fetch('/api/skills/scan', { method: 'POST' });
    const result = await response.json();
    
    if (result.ok) {
      alert(`✅ 掃描完成！找到 ${result.scanned} 個 skills`);
      await loadSkills();
    } else {
      alert('❌ 掃描失敗');
    }
  } catch (error) {
    console.error('Scan failed:', error);
    alert('❌ 掃描失敗：' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 重新掃描';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function downloadSkill(skillId, skillName) {
  try {
    const response = await fetch(`/api/skills/${skillId}/download`);
    
    if (!response.ok) {
      throw new Error('Failed to download skill');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skillName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert(`✅ ${skillName} 下載完成`);
    
  } catch (error) {
    console.error('Download skill error:', error);
    alert(`❌ 下載失敗：${error.message}`);
  }
}

// 初始載入
loadSkills();

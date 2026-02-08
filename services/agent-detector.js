const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

class AgentDetector {
  constructor(pool) {
    this.pool = pool;
    this.agentsDir = path.join(process.env.HOME, '.clawdbot', 'agents');
  }

  /**
   * 偵測所有 Clawdbot agents
   */
  async detectClawdbotAgents() {
    try {
      const agentDirs = await fs.readdir(this.agentsDir);
      const agents = [];

      for (const dir of agentDirs) {
        // 跳過隱藏目錄
        if (dir.startsWith('.')) continue;

        const agentPath = path.join(this.agentsDir, dir);
        const stat = await fs.stat(agentPath);
        
        if (!stat.isDirectory()) continue;

        const agentInfo = await this.parseAgentInfo(dir, agentPath);
        if (agentInfo) {
          agents.push(agentInfo);
        }
      }

      return agents;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️  ~/.clawdbot/agents/ 目錄不存在');
        return [];
      }
      throw error;
    }
  }

  /**
   * 解析單個 agent 的資訊
   */
  async parseAgentInfo(dirName, agentPath) {
    const soulPath = path.join(agentPath, 'SOUL.md');
    const agentsPath = path.join(agentPath, 'AGENTS.md');
    
    let name = dirName;
    let title = '';
    let description = '';
    let skills = [];

    // 優先讀取 SOUL.md
    if (await this.fileExists(soulPath)) {
      const content = await fs.readFile(soulPath, 'utf-8');
      const parsed = this.parseSoulMd(content);
      name = parsed.name || name;
      title = parsed.title || title;
      description = parsed.description || description;
    }
    
    // 備案：讀取 AGENTS.md
    if (!description && await this.fileExists(agentsPath)) {
      const content = await fs.readFile(agentsPath, 'utf-8');
      const parsed = this.parseAgentsMd(content);
      description = parsed.description || description;
    }

    // 讀取 skills 目錄
    const skillsDir = path.join(agentPath, 'skills');
    if (await this.dirExists(skillsDir)) {
      const skillDirs = await fs.readdir(skillsDir);
      skills = skillDirs.filter(s => !s.startsWith('.'));
    }

    // 分配頭像（根據名字或 ID）
    const avatar_url = this.assignAvatar(dirName, name);

    return {
      id: dirName,
      name,
      title,
      description,
      avatar_url,
      clawdbot_agent_id: dirName,
      skills,
      detected_at: new Date()
    };
  }

  /**
   * 解析 SOUL.md 內容
   */
  parseSoulMd(content) {
    const result = {
      name: null,
      title: null,
      description: null
    };

    // 提取名字（多種格式）
    const namePatterns = [
      /name[:\s]+(.+)/i,
      /I am (\w+)/i,
      /My name is (\w+)/i,
      /^#\s+SOUL\.md\s+-\s+(.+?)(?:\s+資安守衛)?$/im,  // # SOUL.md - SecGuard 資安守衛
      /^#\s+(?:SOUL\.md\s+-\s+)?(.+?)$/m  // 通用標題解析（過濾掉 SOUL.md - 前綴）
    ];
    
    for (const pattern of namePatterns) {
      const match = content.match(pattern);
      if (match) {
        let name = match[1].trim();
        // 過濾掉 "Who You Are" 這種通用描述
        if (!name.match(/who you are|what you are/i)) {
          result.name = name;
          break;
        }
      }
    }

    // 提取職稱
    const titlePatterns = [
      /title[:\s]+(.+)/i,
      /role[:\s]+(.+)/i,
      /position[:\s]+(.+)/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = content.match(pattern);
      if (match) {
        result.title = match[1].trim();
        break;
      }
    }

    // 提取描述（第一段非空文字）
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.includes(':')) {
        result.description = trimmed.substring(0, 200);
        break;
      }
    }

    return result;
  }

  /**
   * 解析 AGENTS.md 內容
   */
  parseAgentsMd(content) {
    const result = {
      description: null
    };

    // 提取第一段描述
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.includes('---')) {
        result.description = trimmed.substring(0, 200);
        break;
      }
    }

    return result;
  }

  /**
   * 同步到資料庫
   */
  async syncToDatabase(agents) {
    const results = {
      created: 0,
      updated: 0,
      skills_synced: 0
    };

    for (const agent of agents) {
      try {
        // 檢查 agent 是否已存在（用 clawdbot_agent_id 查詢）
        const existing = await this.pool.query(
          'SELECT id FROM agents WHERE clawdbot_agent_id = $1',
          [agent.clawdbot_agent_id]
        );

        let agentDbId;

        if (existing.rows.length > 0) {
          // 更新現有 agent
          agentDbId = existing.rows[0].id;
          await this.pool.query(
            `UPDATE agents 
             SET name = $1, 
                 title = $2, 
                 description = $3, 
                 avatar_url = $4,
                 last_detected = $5,
                 updated_at = NOW()
             WHERE id = $6`,
            [agent.name, agent.title, agent.description, agent.avatar_url, agent.detected_at, agentDbId]
          );
          results.updated++;
        } else {
          // 新增 agent（讓資料庫自動生成 id）
          const insertResult = await this.pool.query(
            `INSERT INTO agents (name, title, description, avatar_url, clawdbot_agent_id, last_detected, department_id, desk_x, desk_y, status)
             VALUES ($1, $2, $3, $4, $5, $6, 1, 0, 0, 'idle')
             RETURNING id`,
            [agent.name, agent.title, agent.description, agent.avatar_url, agent.clawdbot_agent_id, agent.detected_at]
          );
          agentDbId = insertResult.rows[0].id;
          results.created++;
        }

        // 同步 skills（如果有的話）
        if (agent.skills && agent.skills.length > 0) {
          const skillsSynced = await this.syncAgentSkills(agentDbId, agent.skills);
          results.skills_synced += skillsSynced;
        }

      } catch (error) {
        console.error(`❌ 同步 agent ${agent.id} 失敗:`, error.message);
      }
    }

    return results;
  }

  /**
   * 同步 agent 的 skills
   */
  async syncAgentSkills(agentDbId, skillSlugs) {
    let synced = 0;

    if (!skillSlugs || skillSlugs.length === 0) {
      return 0;
    }

    for (const slug of skillSlugs) {
      try {
        // 確保 skill 存在於 skills 表中
        const skillResult = await this.pool.query(
          'SELECT id FROM skills WHERE slug = $1',
          [slug]
        );

        let skillId;

        if (skillResult.rows.length === 0) {
          // 如果 skill 不存在，先建立一個基本記錄
          const insertResult = await this.pool.query(
            `INSERT INTO skills (name, slug, path, description) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id`,
            [slug, slug, '', 'Auto-detected skill']
          );
          skillId = insertResult.rows[0].id;
        } else {
          skillId = skillResult.rows[0].id;
        }

        // 建立 agent-skill 關聯（忽略重複）
        await this.pool.query(
          `INSERT INTO agent_skills (agent_id, skill_id)
           VALUES ($1, $2)
           ON CONFLICT (agent_id, skill_id) DO NOTHING`,
          [agentDbId, skillId]
        );

        synced++;
      } catch (error) {
        console.error(`❌ 同步 skill ${slug} 失敗:`, error.message);
      }
    }

    return synced;
  }

  /**
   * 分配頭像（根據 agent ID 或名字）
   */
  assignAvatar(agentId, agentName) {
    // 名字對應表（不分大小寫）
    const nameMap = {
      'alex': 'alex',
      'kevin': 'kevin',
      'lena': 'lena',
      'n8n-bot': 'n8n_bot',
      'n8nbot': 'n8n_bot',
      'writer': 'writer',
      '寫文專家': 'writer',
      'main': 'kevin',  // main session 用 kevin 頭像
      'secguard': 'kevin'  // SecGuard 暫時用 kevin 頭像
    };

    const lowerAgentId = agentId.toLowerCase();
    const lowerAgentName = agentName.toLowerCase();

    // 嘗試從 ID 或名字匹配
    let sprite = nameMap[lowerAgentId] || nameMap[lowerAgentName];

    // 如果找不到，使用預設頭像（kevin）
    if (!sprite) {
      sprite = 'kevin';
    }

    // 隨機選擇方向（ne, nw, se, sw）
    const directions = ['ne', 'nw', 'se', 'sw'];
    const direction = directions[Math.floor(Math.random() * directions.length)];

    return `/assets/agents/${sprite}_${direction}.png`;
  }

  /**
   * 工具：檢查檔案是否存在
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 工具：檢查目錄是否存在
   */
  async dirExists(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}

module.exports = AgentDetector;

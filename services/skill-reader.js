const fs = require('fs');
const path = require('path');

class SkillReader {
  constructor() {
    // 掃描多個可能的 skills 目錄
    this.skillPaths = [
      path.join(process.env.HOME, '.clawdbot/skills'),
      path.join(process.env.HOME, '.npm-global/lib/node_modules/clawdbot/skills'),
      '/usr/local/lib/node_modules/clawdbot/skills'
    ];
    
    // 動態掃描所有 agents 的 skills 資料夾
    const agentsPath = path.join(process.env.HOME, '.clawdbot/agents');
    if (fs.existsSync(agentsPath)) {
      const agents = fs.readdirSync(agentsPath, { withFileTypes: true });
      for (const agent of agents) {
        if (agent.isDirectory()) {
          const agentSkillsPath = path.join(agentsPath, agent.name, 'skills');
          if (fs.existsSync(agentSkillsPath)) {
            this.skillPaths.push(agentSkillsPath);
          }
        }
      }
    }
  }

  async scanAllSkills() {
    const allSkills = [];
    const seenSlugs = new Set();
    
    for (const basePath of this.skillPaths) {
      if (!fs.existsSync(basePath)) continue;
      
      const dirs = fs.readdirSync(basePath, { withFileTypes: true });
      
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        
        const skillPath = path.join(basePath, dir.name);
        const skill = await this.parseSkill(skillPath, dir.name);
        
        if (skill && !seenSlugs.has(skill.slug)) {
          seenSlugs.add(skill.slug);
          allSkills.push(skill);
        }
      }
    }
    
    return allSkills;
  }

  async parseSkill(skillPath, defaultName) {
    const packageJsonPath = path.join(skillPath, 'package.json');
    const readmePath = path.join(skillPath, 'README.md');
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    
    let name = defaultName;
    let description = '';
    let version = '';
    let packageJson = null;
    
    // 優先讀取 package.json
    if (fs.existsSync(packageJsonPath)) {
      try {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        name = packageJson.name || defaultName;
        description = packageJson.description || '';
        version = packageJson.version || '';
      } catch (e) {
        console.error(`Failed to parse package.json in ${skillPath}:`, e);
      }
    }
    
    // 如果沒有描述，嘗試從 README.md 提取
    if (!description && fs.existsSync(readmePath)) {
      try {
        const readme = fs.readFileSync(readmePath, 'utf8');
        const lines = readme.split('\n');
        for (const line of lines) {
          if (line.startsWith('#')) {
            description = line.replace(/^#+\s*/, '').trim();
            break;
          }
        }
      } catch (e) {
        console.error(`Failed to read README.md in ${skillPath}:`, e);
      }
    }
    
    // 如果還是沒有描述，嘗試從 SKILL.md 提取
    if (!description && fs.existsSync(skillMdPath)) {
      try {
        const skillMd = fs.readFileSync(skillMdPath, 'utf8');
        const descMatch = skillMd.match(/description:\s*(.+)/i);
        if (descMatch) {
          description = descMatch[1].trim();
        }
      } catch (e) {
        console.error(`Failed to read SKILL.md in ${skillPath}:`, e);
      }
    }
    
    return {
      name,
      slug: defaultName,
      description: description || 'No description available',
      version: version || 'unknown',
      path: skillPath,
      package_json: packageJson
    };
  }

  async saveToDatabase(pool, skills) {
    // 清空現有資料（重新掃描）
    await pool.query('DELETE FROM skills');
    
    for (const skill of skills) {
      await pool.query(
        `INSERT INTO skills (name, slug, description, version, path, package_json)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          skill.name,
          skill.slug,
          skill.description,
          skill.version,
          skill.path,
          JSON.stringify(skill.package_json)
        ]
      );
    }
    
    return skills.length;
  }
}

module.exports = SkillReader;

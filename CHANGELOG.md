# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-02-07

### 🎉 Major Features

#### 1. Agent Detection & Configuration
- Automatic detection of Clawdbot agents from `~/.clawdbot/agents/`
- Parse SOUL.md and AGENTS.md files for agent information
- Agent profile editing (name, title, description)
- Avatar upload support (up to 2MB)
- Skills detection and display for each agent

**API Endpoints:**
- `POST /api/agents/detect` - Auto-detect agents
- `GET /api/agents/detected` - List detected agents
- `PATCH /api/agents/:id/config` - Update agent config
- `POST /api/agents/:id/avatar` - Upload avatar
- `GET /api/agents/:id/skills` - Get agent skills

**Frontend:**
- `/agents-config.html` - Agent configuration page

#### 2. Skills Management
- Automatic scanning of installed skills
- Display skill name, description, version, author
- Track which agents use each skill
- Manual rescan capability

**API Endpoints:**
- `GET /api/skills` - List all skills
- `POST /api/skills/scan` - Rescan skills
- `GET /api/skills/:id` - Get skill details

**Frontend:**
- `/skills.html` - Skills list page

#### 3. Port Scanning
- Automatic port scanning (configurable interval)
- Manual scan trigger
- Risk assessment for each port (High/Medium/Low/Safe)
- Scan history tracking

**API Endpoints:**
- `GET /api/security/settings` - Get security settings
- `POST /api/security/settings` - Update settings
- `POST /api/security/scan` - Manual scan
- `GET /api/security/scan/latest` - Latest results
- `GET /api/security/scan/history` - Scan history

**Frontend:**
- `/security.html` - Security settings page (Port Scan section)

#### 4. Prompt Guard (Prompt Injection Detection)
- Real-time prompt injection detection using Claude AI
- Risk level classification (Safe/Low/Medium/High/Critical)
- 24-hour statistics dashboard
- Test function for manual prompt testing
- Toggle on/off (with token usage warning)

**API Endpoints:**
- `GET /api/security/prompt-guard/stats` - Get statistics
- `GET /api/security/prompt-guard/logs` - Get audit logs
- `POST /api/security/prompt-guard/test` - Test a prompt

**Frontend:**
- `/security.html` - Security settings page (Prompt Guard section)

#### 5. Agent-Skill Association
- Automatic association during agent detection
- Visual display of agent's skills
- Reverse lookup: which agents use a skill

### 🔧 Database Changes

**New Tables:**
- `security_settings` - Security configuration
- `port_scan_results` - Port scan results
- `prompt_audit_log` - Prompt audit logs
- `skills` - Skills catalog
- `agent_skills` - Agent-skill associations

**Modified Tables:**
- `agents` - Added 4 columns:
  - `title` VARCHAR(100)
  - `description` TEXT
  - `clawdbot_agent_id` VARCHAR(100)
  - `last_detected` TIMESTAMP

### 📦 Infrastructure

- Updated `docker-compose.yml` with healthcheck
- Created `init-all.sql` for complete database initialization
- Added `.env.example` for environment variables
- Support for `ANTHROPIC_API_KEY` environment variable
- Avatar storage volume in Docker

### 📚 Documentation

- Comprehensive README update
- API documentation
- Environment variables guide
- FAQ section
- Test report (TEST_REPORT.md)

### 🐛 Bug Fixes

- Fixed agent ID mismatch (VARCHAR vs INTEGER)
- Fixed agent-skill association logic
- Improved error handling in all services

### ⚠️ Breaking Changes

- Database schema changed (requires migration)
- New environment variables required for full functionality

---

## [1.0.0] - 2026-02-05

### Initial Release
- Virtual office dashboard with pixel art style
- Real-time agent status tracking
- Task flow visualization
- Basic security (SSE token, rate limiting)
- Docker deployment support

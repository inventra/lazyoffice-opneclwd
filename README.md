# 🏢 Virtual Office - 虛擬辦公室 Dashboard

一個視覺化的 AI 團隊協作系統，以可愛的像素藝術風格呈現 AI Agents 的工作狀態。

![Virtual Office Screenshot](screenshot.jpg)

## ⚠️ **重要安全警告**

**本應用涉及較大系統權限，包括讀取 Clawdbot agents 資料、存取資料庫等操作。**

🔒 **安全建議：**
- ✅ **僅限本機使用**（預設綁定 `127.0.0.1`）
- ❌ **不建議對外網開放**
- ⚠️ **如需外網訪問，請自行設定 Cloudflare Tunnel 或反向代理，並自行承擔安全風險**
- 💡 作者本人不開放外網訪問，僅供本機開發使用

---

## ✨ 特色功能

### 核心功能
- 🎨 **像素藝術風格** - 可愛的辦公室場景
- 📊 **即時狀態追蹤** - 顯示每個 AI Agent 的工作狀態
- 🔄 **任務流轉動畫** - 視覺化任務在團隊間的流動
- 🐳 **一鍵部署** - Docker Compose 自動化安裝
- 🤖 **Clawdbot 整合** - 原生支援 Clawdbot/OpenClaw

### 安全與管理功能（新增！）
- 🔐 **Port 掃描** - 自動掃描開放的 ports 並評估風險
- 🛡️ **Prompt Guard** - 使用 Claude AI 檢測 prompt injection 攻擊
- 🤖 **Agent 自動偵測** - 自動掃描並匯入 Clawdbot agents
- 🎯 **Skills 管理** - 視覺化 agents 的 skills 與能力
- 🔗 **Agent-Skill 關聯** - 追蹤每個 agent 擁有的技能

## ⚠️ 重要提醒

**性能影響說明：**

Virtual Office 會持續監控您的 AI agents 並提供即時動畫效果。這可能會對 OpenClaw/Clawdbot 的回覆速度造成輕微影響：

- **預期影響：** 回覆延遲增加 0.5-2 秒（取決於系統負載）
- **原因：** 
  - 定期掃描 `~/.clawdbot/agents/` 目錄
  - SSE 連線維持（即時推送動畫）
  - PostgreSQL 資料庫查詢
  
- **建議：**
  - 💻 **開發/測試環境：** 可正常使用
  - 🚀 **生產環境：** 建議部署到獨立機器或關閉即時監控功能
  - ⚡ **高負載場景：** 可調整掃描頻率或停用自動偵測

> 💡 **注意：** 這是正常現象！Virtual Office 是為了視覺化監控而設計，不會影響 agents 的核心功能。

---

## 🚀 快速開始

### 需求
- Docker Desktop ([下載安裝](https://www.docker.com/products/docker-desktop))
- Node.js >= 18（本機開發模式）

### 方案 1：Docker 一鍵部署（推薦）

1. **下載專案**
   ```bash
   git clone https://github.com/你的帳號/virtual-office.git
   cd virtual-office
   ```

2. **設定環境變數（選配）**
   ```bash
   cp .env.example .env
   # 編輯 .env，設定 SSE_TOKEN 和 ANTHROPIC_API_KEY（如果要用 Prompt Guard）
   ```

3. **啟動服務**
   ```bash
   docker-compose up -d
   ```

4. **訪問網頁**
   打開瀏覽器訪問：http://127.0.0.1:3456

### 方案 2：本機開發模式

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **啟動 PostgreSQL**
   ```bash
   # 方式 1：使用 Docker
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=changeme -e POSTGRES_DB=virtual_office postgres:16-alpine
   
   # 方式 2：本機 PostgreSQL
   # 確保 PostgreSQL 已啟動且有 virtual_office 資料庫
   ```

3. **初始化資料庫**
   ```bash
   psql -U postgres virtual_office < init-all.sql
   ```

4. **啟動伺服器**
   ```bash
   node server.js
   ```

5. **訪問網頁**
   打開瀏覽器訪問：http://127.0.0.1:3456

## 🤖 Clawdbot 自動配置

如果你使用 Clawdbot，讓它讀取 `SETUP.md` 即可自動完成所有設定：

```bash
# 在 Clawdbot 中說：
請讀取 ~/Desktop/virtual-office/SETUP.md 並完成設定
```

Clawdbot 會自動：
1. 檢查 Docker 環境
2. 執行安裝腳本
3. 建立 vo-push.sh 整合腳本
4. 配置環境變數

## 📚 功能詳解

### 1. 安全設定（/security.html）

#### Port 掃描
- **自動掃描**：定時掃描本機開放的 ports（可設定間隔時間）
- **手動掃描**：隨時執行即時掃描
- **風險評估**：自動分析每個 port 的風險等級（High/Medium/Low）
- **歷史記錄**：查看過去的掃描結果

#### Prompt Guard（Prompt Injection 檢測）
- **即時檢測**：使用 Claude AI 分析用戶輸入的安全性
- **風險分級**：Safe / Low / Medium / High / Critical
- **統計儀表板**：顯示最近 24 小時的審查統計
- **測試功能**：可手動測試任意文字的安全性

⚠️ **注意**：啟用 Prompt Guard 需要設定 `ANTHROPIC_API_KEY` 環境變數，且會消耗 Claude API tokens。

### 2. Agent 設定（/agents-config.html）

#### 自動偵測 Clawdbot Agents
- **一鍵掃描**：自動掃描 `~/.clawdbot/agents/` 目錄
- **智能解析**：自動讀取 SOUL.md / AGENTS.md 提取資訊
- **Skills 偵測**：自動偵測每個 agent 安裝的 skills

#### Agent 設定管理
- **基本資訊編輯**：名字、職稱、說明
- **頭像上傳**：支援圖片上傳（2MB 以內）
- **Skills 列表**：顯示每個 agent 擁有的技能

### 3. Skills 列表（/skills.html）

- **完整清單**：列出所有已安裝的 skills
- **詳細資訊**：名稱、描述、版本、作者
- **使用追蹤**：顯示哪些 agents 使用了此 skill
- **重新掃描**：手動觸發全系統 skills 掃描

### 4. Agent-Skill 關聯

- **自動建立**：偵測 agents 時自動建立關聯
- **視覺化呈現**：在 Skills 頁面顯示使用此 skill 的 agents
- **反向查詢**：在 Agent 頁面顯示其擁有的 skills

## 🎨 自訂 Agent 圖片（選配）

### 方案 1：使用預設圖片
不需要任何設定，專案已內建可愛的預設圖片。

### 方案 2：KIE.ai 自動生成
1. 註冊 [KIE.ai](https://kie.ai) 並取得 API Key
2. 在安裝時選擇「使用 KIE.ai 生成圖片」
3. 輸入 API Key
4. 系統會自動為每個 Agent 生成個性化圖片

或手動設定：
```bash
echo "KIE_AI_API_KEY=your-api-key-here" >> .env
```

然後呼叫 API：
```bash
curl -X POST http://127.0.0.1:3456/api/generate-avatar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SSE_TOKEN" \
  -d '{
    "agentId": "alex",
    "prompt": "A cute pixel art avatar of a developer cat wearing glasses"
  }'
```

## 📊 架構說明

```
┌─────────────────────────────────────┐
│ 用戶瀏覽器                           │
│ http://127.0.0.1:3456                │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ Node.js Server (Express)            │
│ - 前端靜態檔案                       │
│ - REST API                          │
│ - SSE 即時推送                       │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ PostgreSQL 資料庫                   │
│ - departments（部門）                │
│ - agents（員工）                     │
│ - tasks（任務）                      │
│ - task_flows（流轉記錄）             │
└─────────────────────────────────────┘
```

## 🔧 進階使用

### Docker 指令

**啟動服務**
```bash
docker-compose up -d
```

**停止服務**
```bash
docker-compose down
```

**查看日誌**
```bash
docker-compose logs -f app
```

**重新啟動**
```bash
docker-compose restart
```

**資料備份**
```bash
docker-compose exec postgres pg_dump -U postgres virtual_office > backup.sql
```

**完全重置（刪除所有資料）**
```bash
docker-compose down -v
docker-compose up -d
```

### 環境變數說明

建立 `.env` 檔案（或複製 `.env.example`）：

```bash
# 必要設定
SSE_TOKEN=your-secret-token-here    # SSE 驗證 token（建議用 uuid）
DATABASE_URL=postgres://...          # 資料庫連線字串

# 選配：Prompt Guard
ANTHROPIC_API_KEY=sk-ant-...        # Claude API Key（啟用 Prompt Guard 需要）

# 選配：圖片生成
KIE_AI_API_KEY=...                  # KIE.ai API Key

# 選配：Agent 偵測路徑
CLAWDBOT_AGENTS_PATH=~/.clawdbot/agents/
```

### Agent 偵測路徑設定

如果在 Docker 環境中使用 Agent 偵測功能，需要 mount 本機的 `.clawdbot` 目錄：

```yaml
# docker-compose.yml
services:
  app:
    volumes:
      - ~/.clawdbot:/root/.clawdbot:ro  # 唯讀掛載
```

## 🔐 資安說明

本專案採用**最高資安標準**：

- ✅ **本機限定訪問** - 只監聽 127.0.0.1（外部無法連線）
- ✅ **Token 驗證** - SSE 和敏感 API 需要 Bearer Token
- ✅ **Rate Limiting** - API 限流防爆破（60/分鐘）
- ✅ **SQL 參數化** - 防 SQL Injection
- ✅ **CORS 限制** - 只允許本機來源

### 取得 SSE Token
```bash
docker-compose logs app | grep "SSE Token"
```

## 📡 API 文件

### Skills API
- `GET /api/skills` - 列出所有 skills
- `POST /api/skills/scan` - 重新掃描 skills
- `GET /api/skills/:id` - 取得單個 skill 詳情

### Agent Detection API
- `POST /api/agents/detect` - 自動偵測 Clawdbot agents（需要認證）
- `GET /api/agents/detected` - 取得已偵測的 agents
- `PATCH /api/agents/:id/config` - 更新 agent 設定
- `POST /api/agents/:id/avatar` - 上傳頭像（multipart/form-data）
- `GET /api/agents/:id/skills` - 取得 agent 的 skills

### Security API
- `GET /api/security/settings` - 取得安全設定
- `POST /api/security/settings` - 更新安全設定
- `POST /api/security/scan` - 手動觸發 port 掃描
- `GET /api/security/scan/latest` - 取得最新掃描結果
- `GET /api/security/scan/history` - 取得歷史掃描記錄

### Prompt Guard API
- `GET /api/security/prompt-guard/stats` - 取得統計（可選參數：hours）
- `GET /api/security/prompt-guard/logs` - 取得審查記錄（可選參數：limit）
- `POST /api/security/prompt-guard/test` - 測試單個 prompt

**認證方式**：
```bash
Authorization: Bearer YOUR_SSE_TOKEN
```

## 📝 常見問題

**Q: 如何取得 SSE Token？**
```bash
# Docker 環境
docker-compose logs app | grep "SSE Token"

# 本機環境
# 啟動 server.js 後會在 console 顯示
```

**Q: 如何新增 Agent？**
方式 1（推薦）：使用自動偵測
```bash
# 在 /agents-config.html 點擊「自動偵測」按鈕
```

方式 2：手動插入資料庫
```sql
INSERT INTO agents (name, department_id, desk_x, desk_y, clawdbot_agent_id) 
VALUES ('Agent Name', 2, 50, 60, 'agent-id');
```

**Q: 如何修改資料庫密碼？**
修改 `docker-compose.yml` 中的 `POSTGRES_PASSWORD` 並重新啟動。

**Q: 資料會遺失嗎？**
不會，資料儲存在 Docker volume `postgres_data` 中，除非執行 `docker-compose down -v`。

**Q: Prompt Guard 消耗多少 tokens？**
- 每次檢查約 500-1000 tokens（輸入 200-500 + 輸出 100-300）
- 每天 100 則訊息約 $0.21 USD
- 建議監控 token 使用量，避免超出預算

**Q: Agent 偵測失敗怎麼辦？**
1. 確認 `~/.clawdbot/agents/` 目錄存在
2. 確認目錄中有 SOUL.md 或 AGENTS.md 檔案
3. 檢查檔案權限（Docker 需要讀取權限）

**Q: 如何備份資料？**
```bash
# 備份資料庫
docker-compose exec postgres pg_dump -U postgres virtual_office > backup.sql

# 恢復資料
docker-compose exec -T postgres psql -U postgres virtual_office < backup.sql
```

**Q: 可以掛域名嗎？**

⚠️ **不建議對外網開放！** 本應用涉及較大權限操作（讀取 agents 資料、資料庫存取等）。

如您堅持需要外網訪問，可自行設定 Cloudflare Tunnel 或其他反向代理方案：
```bash
# 僅供參考，請自行承擔安全風險
cloudflared tunnel --url http://127.0.0.1:3456
```

**建議做法：**
- 使用 VPN 連回本機
- 使用 SSH Tunnel 轉發
- 不要直接暴露到公網

**Q: 如何更新到最新版本？**
```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🤝 貢獻

歡迎提交 Pull Request 或回報 Issue！

## 📄 授權

MIT License

## 🎉 更新日誌

### v2.0.0 (2026-02-07)
- ✨ 新增：Agent 自動偵測與設定（自動掃描 ~/.clawdbot/agents/）
- ✨ 新增：Skills 管理與列表頁面
- ✨ 新增：Port 掃描功能（安全監控）
- ✨ 新增：Prompt Guard（Prompt Injection 檢測）
- ✨ 新增：Agent-Skill 關聯追蹤
- 🔧 改進：資料庫 schema 擴充（5 個新表格）
- 🔧 改進：前端導航優化
- 📚 文件：完整的 API 文件和使用指南

## 🙏 鳴謝

- [Clawdbot](https://clawd.bot) - AI Agent 框架
- [Anthropic Claude](https://www.anthropic.com/) - Prompt Guard AI
- [KIE.ai](https://kie.ai) - 圖片生成 API
- 偷懶辦公室團隊

## 📊 專案統計

- **前端頁面**：4 個（index, security, agents-config, skills）
- **API 端點**：25+ 個
- **資料庫表格**：10 個
- **程式碼行數**：約 3000+ 行
- **開發時間**：2 天

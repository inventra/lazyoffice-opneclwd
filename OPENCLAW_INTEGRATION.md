# Virtual Office - OpenClaw 整合指南

## 📋 概述

Virtual Office 是一個視覺化的 AI Agent 管理系統，可以：
- 自動偵測 Clawdbot/Moltbot agents
- 即時顯示 agent 動態（像素風辦公室場景）
- 管理 agent 技能、任務、安全設定

**本文件提供完整的安裝和對接說明，OpenClaw 可依此自動部署。**

---

## 🚀 快速安裝

### 方法 1：本地安裝（推薦開發環境）

```bash
# 1. 確認前置需求
node --version  # 需要 Node.js 20+
psql --version  # 需要 PostgreSQL 17+

# 2. 克隆專案（或從備份解壓）
cd ~/Desktop
# git clone <repository> virtual-office
# 或直接使用現有目錄

# 3. 安裝依賴
cd virtual-office
npm install

# 4. 建立資料庫
createdb virtual_office
psql -d virtual_office -f init-db.sql

# 5. 啟動服務
node server.js

# 6. 訪問
# http://127.0.0.1:3210
```

### 方法 2：Docker 安裝（推薦生產環境）

```bash
cd ~/Desktop/virtual-office

# 啟動（包含 PostgreSQL）
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 訪問
# http://127.0.0.1:3210
```

---

## 🔌 OpenClaw 對接

### 1. 自動偵測 Agents

Virtual Office 會自動掃描 `~/.clawdbot/agents/` 目錄：

```javascript
// agents 會被自動發現
~/.clawdbot/agents/
  ├── kevin/
  ├── alex/
  ├── lena/
  ├── n8n-bot/
  └── ...
```

每個 agent 需要：
- `SOUL.md` 或 `AGENTS.md`（提取名字、職稱、描述）
- `skills/` 目錄（自動同步技能列表）

### 2. 即時動畫推送

當 agent 收到訊息或完成任務時，推送動畫事件：

```bash
# 推送腳本已安裝在 ~/scripts/vo-push.sh

# 使用範例
~/scripts/vo-push.sh message_received kevin "kevin小幫手" "收到新訊息"
~/scripts/vo-push.sh thinking kevin小幫手
~/scripts/vo-push.sh delegate kevin小幫手 alex "寫程式任務"
~/scripts/vo-push.sh task_complete alex kevin小幫手
```

**整合到 AGENTS.md（Kevin小幫手）：**

```markdown
## 💓 Heartbeats - Be Proactive!

**自動推送規則（強制執行！）**

1. **收到 Kevin 的訊息時**
   ```bash
   exec background: ~/scripts/vo-push.sh message_received kevin kevin小幫手 "訊息前10字..."
   ```

2. **開始思考時**
   ```bash
   exec background: ~/scripts/vo-push.sh thinking kevin小幫手
   ```

3. **分派任務時**（每次 sessions_spawn 之前）
   ```bash
   exec background: ~/scripts/vo-push.sh delegate kevin小幫手 <agent_id> "任務摘要"
   ```

4. **agent 完成任務時**
   ```bash
   exec background: ~/scripts/vo-push.sh task_complete <agent_id> kevin小幫手
   ```

5. **回覆後**
   ```bash
   exec background: ~/scripts/vo-push.sh task_complete kevin小幫手 kevin "回覆摘要"
   ```
```

### 3. API 端點

Virtual Office 提供 REST API：

```bash
# 取得所有 agents
curl http://127.0.0.1:3210/api/agents

# 取得已偵測的 agents
curl http://127.0.0.1:3210/api/agents/detected

# 取得單一 agent 詳情
curl http://127.0.0.1:3210/api/agents/7

# 取得 agent 的 skills
curl http://127.0.0.1:3210/api/agents/7/skills

# 偵測新 agents
curl -X POST http://127.0.0.1:3210/api/agents/detect \
  -H "Authorization: Bearer $TOKEN"

# 推送動畫事件
curl -X POST "http://127.0.0.1:3210/api/animation?token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"message_received","from":"kevin","to":"kevin小幫手","text":"測試"}'
```

---

## 🎯 推送事件類型

| 事件類型 | from | to | text | 說明 |
|---------|------|----|----|------|
| `message_received` | 發訊息的人 | 收訊息的 agent | 訊息摘要 | 收到訊息 |
| `thinking` | agent_id | - | - | 開始思考 |
| `delegate` | dispatcher | assignee | 任務摘要 | 分派任務 |
| `task_complete` | agent_id | dispatcher | 結果摘要 | 完成任務 |
| `status_change` | agent_id | - | new_status | 狀態變更 |

**Agent ID 對應：**
- `kevin` → kevin agent
- `kevin小幫手` → main session
- `alex` → Alex agent
- `lena` → Lena agent
- `n8n-bot` → n8n小幫手
- `writer` → 寫文專家

---

## 🔧 環境變數

Virtual Office 支援以下環境變數：

```bash
# PostgreSQL 連線
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=virtual_office
export PGUSER=postgres
export PGPASSWORD=your-password

# 應用設定
export PORT=3210
export NODE_ENV=production

# API Keys（可選）
export ANTHROPIC_API_KEY=sk-...
export KIE_AI_API_KEY=...

# 推送 URL（如果 Virtual Office 在遠端）
export VO_URL=https://office.lazyoffice.app
```

---

## 📂 目錄結構

```
virtual-office/
├── server.js                  # 主程式
├── package.json
├── Dockerfile
├── docker-compose.yml
├── init-db.sql               # 資料庫 schema
├── public/                   # 前端
│   ├── index.html           # 主頁（辦公室場景）
│   ├── agents-config.html   # 員工設定
│   ├── security.html        # 安全設定
│   ├── skills.html          # 技能管理
│   └── assets/              # 像素風頭像
├── services/                 # 後端服務
│   ├── agent-detector.js    # 自動偵測 agents
│   ├── skill-reader.js      # 掃描 skills
│   ├── port-scanner.js      # 安全掃描
│   └── prompt-guard.js      # Prompt 安全檢查
└── middleware/
    └── prompt-check.js      # Prompt 檢查中間件
```

---

## 🔒 安全設定

### 預設安全配置
- ✅ 只監聽 `127.0.0.1`（不對外網）
- ✅ CORS 只允許本地來源
- ✅ Rate Limiting（60 req/min）
- ✅ SSE Token 驗證
- ✅ PostgreSQL 本機連線

### 如需對外網開放（不推薦）

1. **修改 server.js**
   ```javascript
   // 從這行
   app.listen(PORT, '127.0.0.1', () => {
   
   // 改成
   app.listen(PORT, '0.0.0.0', () => {
   ```

2. **修改 CORS**
   ```javascript
   app.use(cors({
     origin: ['https://你的域名.com'],
     credentials: true
   }));
   ```

3. **使用 Cloudflare Tunnel**（推薦）
   ```bash
   cloudflared tunnel --url http://127.0.0.1:3210
   ```

---

## 🩺 健康檢查

```bash
# 檢查服務是否運行
curl http://127.0.0.1:3210/api/agents

# 檢查 PostgreSQL
psql -d virtual_office -c "SELECT COUNT(*) FROM agents;"

# 檢查 SSE 連線
curl http://127.0.0.1:3210/api/token

# 測試推送
~/scripts/vo-push.sh message_received test test "健康檢查"
```

---

## 🐛 故障排除

### 問題 1: 動畫不顯示

**原因：** 推送腳本沒有 token 或 URL 錯誤

**解決：**
```bash
# 檢查腳本
cat ~/scripts/vo-push.sh

# 手動測試
export VO_URL=http://127.0.0.1:3210
~/scripts/vo-push.sh message_received kevin test "測試"

# 檢查 server log
tail -f /tmp/vo-server.log
```

### 問題 2: Agent 沒有被偵測到

**原因：** 缺少 SOUL.md 或 AGENTS.md

**解決：**
```bash
# 確認檔案存在
ls ~/.clawdbot/agents/*/SOUL.md

# 手動觸發偵測
curl -X POST http://127.0.0.1:3210/api/agents/detect \
  -H "Authorization: Bearer $(curl -s http://127.0.0.1:3210/api/token | jq -r .token)"
```

### 問題 3: Skills 沒有同步

**原因：** agent_skills 表為空

**解決：**
```bash
# 重新同步
curl -X POST http://127.0.0.1:3210/api/skills/scan

# 觸發 agent 偵測（會自動同步 skills）
curl -X POST http://127.0.0.1:3210/api/agents/detect \
  -H "Authorization: Bearer $(curl -s http://127.0.0.1:3210/api/token | jq -r .token)"
```

---

## 🔄 更新與維護

### 更新應用
```bash
cd ~/Desktop/virtual-office

# 停止服務
lsof -ti:3210 | xargs kill

# 拉取最新版本
git pull

# 重啟
node server.js
```

### 備份資料
```bash
# 備份資料庫
pg_dump virtual_office > backup-$(date +%Y%m%d).sql

# 備份整個目錄
tar czf virtual-office-backup.tar.gz ~/Desktop/virtual-office
```

### 清理舊資料
```bash
# 清理舊的 port scan 記錄
psql -d virtual_office -c "DELETE FROM port_scan_results WHERE scanned_at < NOW() - INTERVAL '30 days';"

# 清理舊的 prompt audit log
psql -d virtual_office -c "DELETE FROM prompt_audit_log WHERE created_at < NOW() - INTERVAL '90 days';"
```

---

## 📝 自動化腳本範例

### Cron 定期偵測新 agents

```bash
# 每 5 分鐘自動偵測新 agents
*/5 * * * * curl -s -X POST http://127.0.0.1:3210/api/agents/detect -H "Authorization: Bearer $(curl -s http://127.0.0.1:3210/api/token | jq -r .token)" > /dev/null 2>&1
```

### 開機自動啟動

```bash
# 建立 systemd service（Linux）
cat > /etc/systemd/system/virtual-office.service << 'EOF'
[Unit]
Description=Virtual Office
After=postgresql.service

[Service]
Type=simple
User=你的使用者
WorkingDirectory=/path/to/virtual-office
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable virtual-office
sudo systemctl start virtual-office
```

---

## 🎓 學習資源

- **前端架構：** 純 HTML/JS，無框架依賴
- **後端框架：** Express.js + PostgreSQL
- **即時通訊：** Server-Sent Events (SSE)
- **動畫系統：** CSS + Canvas 像素風
- **API 設計：** RESTful

---

## 📞 技術支援

**相關文件：**
- `DOCKER_README.md` - Docker 部署指南
- `SECURITY_SCAN_REPORT.md` - 安全掃描報告
- `DEPLOYMENT_SUMMARY.md` - 部署總結

**常見問題：**
1. Token 驗證失敗 → 檢查 `~/scripts/vo-push.sh` 中的 `VO_URL`
2. PostgreSQL 連線失敗 → 檢查環境變數 `PGHOST`, `PGPORT` 等
3. 動畫不顯示 → 檢查 SSE 連線狀態（左上角應顯示 LIVE）

---

**版本：** 1.0.0  
**更新日期：** 2026-02-08  
**狀態：** ✅ 生產就緒

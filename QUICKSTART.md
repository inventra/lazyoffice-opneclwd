# Virtual Office - 5 分鐘快速開始

## 🎯 目標

讓 Virtual Office 在 5 分鐘內運行起來，並整合到你的 Clawdbot/Moltbot 系統。

---

## ⚡ 3 步驟啟動

### 步驟 1：啟動服務（選一種）

#### 選項 A：本地啟動（最快）
```bash
cd ~/Desktop/virtual-office
npm install
node server.js
```

#### 選項 B：Docker 啟動（推薦生產環境）
```bash
cd ~/Desktop/virtual-office
docker-compose up -d
```

### 步驟 2：驗證

開啟瀏覽器：**http://127.0.0.1:3210**

應該看到像素風辦公室場景。

### 步驟 3：整合到 Kevin小幫手

編輯 `~/.clawdbot/agents/kevin/AGENTS.md`，加入：

```markdown
## 💓 Virtual Office 推送（自動執行）

**在以下時機自動推送動畫事件：**

1. 收到 Kevin 訊息時：
   ```bash
   exec background: ~/scripts/vo-push.sh message_received kevin kevin小幫手 "訊息前10字..."
   ```

2. 開始處理時：
   ```bash
   exec background: ~/scripts/vo-push.sh thinking kevin小幫手
   ```

3. 分派任務給 agent 時：
   ```bash
   exec background: ~/scripts/vo-push.sh delegate kevin小幫手 alex "任務摘要"
   ```

4. agent 完成後：
   ```bash
   exec background: ~/scripts/vo-push.sh task_complete alex kevin小幫手
   ```

5. 回覆 Kevin 後：
   ```bash
   exec background: ~/scripts/vo-push.sh task_complete kevin小幫手 kevin "回覆摘要"
   ```

**鐵律：** 所有推送都用 `exec background`，失敗無視，不影響正常流程。
```

---

## ✅ 測試

發送一條測試訊息給 Kevin：

```bash
# 在你的 Telegram 跟 Kevin小幫手說話
# 然後打開 http://127.0.0.1:3210
# 應該會看到 kevin 和 kevin小幫手 之間有動畫
```

---

## 🔧 推送腳本說明

`~/scripts/vo-push.sh` 已自動配置，使用方式：

```bash
# 基本格式
~/scripts/vo-push.sh <事件類型> <from> [to] [text]

# 範例
~/scripts/vo-push.sh message_received kevin "kevin小幫手" "收到新訊息"
~/scripts/vo-push.sh thinking kevin小幫手
~/scripts/vo-push.sh delegate kevin小幫手 alex "寫程式"
~/scripts/vo-push.sh task_complete alex kevin小幫手
```

**環境變數（可選）：**
```bash
export VO_URL=http://127.0.0.1:3210  # 預設值
export VO_TOKEN=...                   # 自動取得
```

---

## 🎨 功能速覽

訪問 http://127.0.0.1:3210 後：

1. **主頁面** - 像素風辦公室，即時動畫
2. **員工設定** - 管理 agents（點右上角「🤖 員工設定」）
3. **技能管理** - 查看所有 skills
4. **安全設定** - Port 掃描、Prompt Guard

---

## 📊 API 快速參考

```bash
# 取得 token
curl http://127.0.0.1:3210/api/token

# 列出所有 agents
curl http://127.0.0.1:3210/api/agents

# 推送動畫
TOKEN=$(curl -s http://127.0.0.1:3210/api/token | jq -r .token)
curl -X POST "http://127.0.0.1:3210/api/animation?token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"message_received","from":"kevin","to":"kevin小幫手","text":"測試"}'
```

---

## 🐛 快速故障排除

### 問題：動畫不顯示

```bash
# 1. 檢查 server 是否運行
curl http://127.0.0.1:3210/api/agents

# 2. 檢查左上角是否顯示 LIVE（不是 OFFLINE）
# 如果是 OFFLINE，重新整理頁面（Cmd+Shift+R）

# 3. 手動測試推送
~/scripts/vo-push.sh message_received test test "測試"
```

### 問題：找不到 agents

```bash
# 1. 確認檔案存在
ls ~/.clawdbot/agents/*/SOUL.md

# 2. 手動觸發偵測
TOKEN=$(curl -s http://127.0.0.1:3210/api/token | jq -r .token)
curl -X POST http://127.0.0.1:3210/api/agents/detect \
  -H "Authorization: Bearer $TOKEN"

# 3. 重新整理網頁
```

---

## 🚀 下一步

1. ✅ 完成上述 3 個步驟
2. 📖 閱讀 `OPENCLAW_INTEGRATION.md` 了解完整整合
3. 🔒 閱讀 `SECURITY_SCAN_REPORT.md` 了解安全設定
4. 🐳 如需生產部署，參考 `DOCKER_README.md`

---

**預估完成時間：** 5 分鐘  
**難度：** ⭐ 簡單  
**需要重啟 Clawdbot？** ❌ 不需要

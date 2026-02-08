# Agent 偵測功能修復驗證指南

## 快速驗證步驟

### 1. 啟動 Server
```bash
cd ~/Desktop/virtual-office
node server.js
```

應該看到：
```
🔐 SSE Token: c48edf9c-712f-4c8f-976a-e9b21fc9f9e8
🏢 Virtual Office running at http://127.0.0.1:3210
```

### 2. 測試 Token API
```bash
curl http://127.0.0.1:3210/api/token
```

應該返回：
```json
{"token":"c48edf9c-712f-4c8f-976a-e9b21fc9f9e8"}
```

### 3. 測試 Agent 偵測 API
```bash
# 取得 token
TOKEN=$(curl -s http://127.0.0.1:3210/api/token | jq -r '.token')

# 測試偵測
curl -X POST http://127.0.0.1:3210/api/agents/detect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

應該返回：
```json
{
  "ok": true,
  "detected": 9,
  "created": 0,
  "updated": 9,
  "skills_synced": 32,
  "agents": [...]
}
```

### 4. 瀏覽器測試
1. 開啟 http://127.0.0.1:3210/agents-config.html
2. 開啟開發者工具 Console（F12）
3. 應該看到：`✅ SSE Token initialized`
4. 點擊「自動偵測 Clawdbot Agents」按鈕
5. 應該顯示：`✅ 偵測完成！找到 9 個 Agents（新增 0 個，更新 9 個，同步 32 個 skills）`

### 5. 自動化測試
```bash
/tmp/test-agent-detection.sh
```

所有測試應該顯示 ✅。

---

## 問題排除

### 問題：401 Unauthorized
**原因：** Token 未正確傳遞  
**解決：** 
1. 清除 localStorage：`localStorage.clear()`
2. 重新整理頁面
3. 確認 Console 顯示 `✅ SSE Token initialized`

### 問題：Detection failed
**原因：** 後端錯誤  
**解決：**
1. 檢查 server.js 是否正確啟動
2. 檢查 `~/.clawdbot/agents/` 目錄是否存在
3. 檢查資料庫連線是否正常

### 問題：Cannot GET /api/token
**原因：** Server 未更新  
**解決：**
1. 停止舊的 server：`pkill -f "node server.js"`
2. 重新啟動：`cd ~/Desktop/virtual-office && node server.js`

---

## 修改內容摘要

### server.js（第 51-53 行）
```javascript
// API: 取得 SSE Token（不需認證，供前端初始化使用）
app.get('/api/token', (req, res) => {
  res.json({ token: SSE_TOKEN });
});
```

### public/agents-config.js（第 1-20 行）
```javascript
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
```

---

## 相關檔案
- 完整修復報告：`~/.clawdbot/agents/alex/memory/2026-02-07-agent-detection-fix.md`
- 測試腳本：`/tmp/test-agent-detection.sh`

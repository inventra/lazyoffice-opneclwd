# Virtual Office 自動化設定指南

這份文件是給 Clawdbot/OpenClaw 讀的。當用戶下載專案後,讓 AI 助手讀取此文件即可自動完成設定。

## 🤖 給 AI 助手的指示

如果你是 Clawdbot 或其他 AI 助手,請按以下步驟協助用戶設定：

### 1. 環境檢查
```bash
# 檢查 Docker 是否安裝
docker --version
```
如果未安裝,引導用戶到：https://www.docker.com/products/docker-desktop

### 2. 執行安裝腳本
```bash
cd ~/Desktop/virtual-office/
chmod +x setup.sh
./setup.sh
```

### 3. 配置 Clawdbot 整合
建立 `vo-push.sh` 腳本在用戶的 `~/scripts/` 目錄：

```bash
#!/bin/bash
# Virtual Office 事件推送腳本

TYPE=${1:-message_received}
FROM=${2:-kevin}
TO=${3}
TEXT=${4}

curl -X POST http://127.0.0.1:3210/api/animation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SSE_TOKEN" \
  -d "{
    \"type\": \"$TYPE\",
    \"from\": \"$FROM\",
    \"to\": \"$TO\",
    \"text\": \"$TEXT\"
  }" &> /dev/null
```

### 4. 取得 SSE Token
```bash
docker-compose logs app | grep "SSE Token"
```
將 Token 加入用戶的 `.env` 或環境變數。

### 5. 驗證
訪問 http://127.0.0.1:3210 確認網頁正常顯示。

## 🎨 KIE.ai 圖片生成（選配）

如果用戶想自訂 agent 圖片,需要：
1. 註冊 KIE.ai 帳號並取得 API Key
2. 在 `.env` 中設定 `KIE_AI_API_KEY`
3. 呼叫 `/api/generate-avatar` API 生成圖片

未設定 API Key 則使用預設圖片。

## 📝 常見問題

**Q: 如何停止服務？**
```bash
docker-compose down
```

**Q: 如何查看日誌？**
```bash
docker-compose logs -f app
```

**Q: 如何重新啟動？**
```bash
docker-compose restart
```

**Q: 資料會遺失嗎？**
不會,PostgreSQL 資料儲存在 Docker volume 中。

## 🔧 進階配置

詳見完整 README.md。

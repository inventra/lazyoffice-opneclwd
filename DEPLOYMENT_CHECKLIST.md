# Virtual Office - Docker 部署檢查清單

## ✅ 檔案檢查

- [x] `Dockerfile` - Docker 映像檔定義
- [x] `docker-compose.yml` - Docker Compose 配置
- [x] `init-db.sql` - 資料庫初始化腳本
- [x] `.dockerignore` - Docker 建置忽略規則
- [x] `.gitignore` - Git 版控忽略規則
- [x] `DOCKER_README.md` - Docker 使用說明
- [x] `SECURITY_SCAN_REPORT.md` - 安全掃描報告
- [x] `DEPLOYMENT_SUMMARY.md` - 部署總結

## ✅ 安全檢查

- [x] 刪除測試腳本（`delete-test-agent.js`）✅
- [x] Server 只監聽 127.0.0.1 ✅
- [x] PostgreSQL 只監聽 localhost ✅
- [x] CORS 只允許本地來源 ✅
- [x] Rate Limiting 已啟用 ✅
- [x] SSE Token 驗證 ✅
- [x] 環境變數支援 ✅
- [x] Non-root user 執行 ✅

**安全評分：95/100** 🔒

## 🚀 部署步驟

### 1. 前置準備
```bash
# 確認目錄
cd ~/Desktop/virtual-office

# 確認 ~/.clawdbot 存在
ls -la ~/.clawdbot

# （可選）建立 .env 檔案設定環境變數
cp .env.example .env
# 編輯 .env 設定 POSTGRES_PASSWORD 等
```

### 2. 啟動服務
```bash
# 啟動（首次會自動建置）
docker-compose up -d

# 等待服務啟動（約 30 秒）
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### 3. 驗證
```bash
# 檢查服務狀態
docker-compose ps

# 應該看到兩個服務都是 healthy
# - virtual-office-db (Up, healthy)
# - virtual-office-app (Up, healthy)

# 測試 API
curl http://127.0.0.1:3210/api/agents

# 開啟瀏覽器
open http://127.0.0.1:3210
```

### 4. 停止服務
```bash
# 停止但保留資料
docker-compose down

# 停止並刪除所有資料
docker-compose down -v
```

## 🔧 常見問題

### Q1: Port 3210 已被佔用
```bash
# 檢查
lsof -ti:3210

# 修改 docker-compose.yml
# ports:
#   - "127.0.0.1:3211:3210"
```

### Q2: PostgreSQL 初始化失敗
```bash
# 刪除 volume 重新初始化
docker-compose down -v
docker-compose up -d
```

### Q3: 無法存取 clawdbot agents
```bash
# 確認掛載路徑
docker-compose exec app ls -la /home/nodejs/.clawdbot

# 修改 docker-compose.yml 中的路徑
# volumes:
#   - /你的實際路徑/.clawdbot:/home/nodejs/.clawdbot:ro
```

## 📝 後續維護

### 定期備份
```bash
# 備份資料庫
docker-compose exec postgres pg_dump -U postgres virtual_office > backup-$(date +%Y%m%d).sql

# 備份 volume
docker run --rm -v virtual-office_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data-backup.tar.gz /data
```

### 更新應用
```bash
# 拉取最新程式碼
git pull

# 重新建置並啟動
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 監控
```bash
# 查看資源使用
docker stats virtual-office-app virtual-office-db

# 查看日誌
docker-compose logs -f app

# 查看最近 100 行
docker-compose logs --tail=100 app
```

## 📞 技術支援

如有問題請查閱：
- `DOCKER_README.md` - 詳細使用說明
- `SECURITY_SCAN_REPORT.md` - 安全掃描報告  
- `DEPLOYMENT_SUMMARY.md` - 部署總結

---

**建立時間：** 2026-02-08 02:10
**狀態：** ✅ 準備就緒

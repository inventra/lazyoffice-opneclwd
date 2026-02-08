# Virtual Office - Docker 部署指南

## ⚠️ **重要安全警告**

**本應用涉及較大系統權限，包括：**
- 讀取 Clawdbot agents 資料（可能包含敏感資訊）
- 存取 PostgreSQL 資料庫
- 執行 agent 相關操作

**🔒 安全建議：**
1. **僅限本機使用**（預設綁定 127.0.0.1）
2. **不建議對外網開放**
3. **定期檢查資料庫存取日誌**
4. **不要在公開伺服器上運行**

### 外網存取（不建議）

如您堅持需要外網訪問，可自行設定 Cloudflare Tunnel、nginx 反向代理或其他方案。**請自行承擔安全風險。**

作者個人不開放外網訪問，僅供本機開發使用。

---

## 📋 系統需求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用記憶體

## 🚀 快速開始

### 1. 環境變數設定（可選）

建立 `.env` 檔案（或使用系統環境變數）：

```bash
# PostgreSQL 設定
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password

# API Keys（可選）
ANTHROPIC_API_KEY=your-key-here
KIE_AI_API_KEY=your-key-here
```

### 2. 啟動服務

```bash
# 建置並啟動所有服務
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 只看 app 日誌
docker-compose logs -f app
```

### 3. 訪問應用

開啟瀏覽器訪問：**http://127.0.0.1:3456**

**僅限本機訪問**（不對外網開放）

## 🔧 常用指令

### 停止服務
```bash
docker-compose down
```

### 停止並清除所有資料
```bash
docker-compose down -v
```

### 重新建置映像檔
```bash
docker-compose build --no-cache
docker-compose up -d
```

### 查看運行狀態
```bash
docker-compose ps
```

### 進入容器 shell
```bash
# 進入 app 容器
docker-compose exec app sh

# 進入 postgres 容器
docker-compose exec postgres psql -U postgres -d virtual_office
```

## 📊 資料持久化

- PostgreSQL 資料儲存在 Docker volume `postgres-data`
- Clawdbot agents 資料掛載為唯讀（`~/.clawdbot`）
- 應用日誌輸出到 `./logs` 目錄

## 🔒 安全設定

### 網路隔離
- 所有服務只監聽 `127.0.0.1`（不對外網開放）
- 使用 Docker 內部網路通訊

### 非 root 使用者
- App 容器以 `nodejs` 使用者運行（UID 1001）
- 降低安全風險

### 環境變數
- 敏感資訊透過環境變數傳遞
- 不在映像檔中包含密碼或 API key

## 🩺 健康檢查

服務包含自動健康檢查：

- **PostgreSQL**: 每 10 秒檢查一次
- **App**: 每 30 秒檢查 `/api/agents` 端點

查看健康狀態：
```bash
docker-compose ps
```

## 🐛 故障排除

### 1. PostgreSQL 連線失敗
```bash
# 檢查資料庫是否啟動
docker-compose logs postgres

# 重啟資料庫
docker-compose restart postgres
```

### 2. App 無法存取 Clawdbot agents
```bash
# 確認 HOME 環境變數正確
echo $HOME

# 檢查掛載路徑
docker-compose exec app ls -la /home/nodejs/.clawdbot
```

### 3. 端口被佔用
```bash
# 檢查哪個程式佔用 3456 端口
lsof -ti:3456

# 修改 docker-compose.yml 中的端口映射
# ports:
#   - "127.0.0.1:3457:3456"  # 改用 3457
```

## 📦 生產環境建議

1. **使用強密碼**
   ```bash
   POSTGRES_PASSWORD=$(openssl rand -base64 32)
   ```

2. **定期備份資料庫**
   ```bash
   docker-compose exec postgres pg_dump -U postgres virtual_office > backup.sql
   ```

3. **監控容器資源使用**
   ```bash
   docker stats virtual-office-app virtual-office-db
   ```

4. **設定自動重啟**
   - docker-compose.yml 已設定 `restart: unless-stopped`

## 🔄 更新應用

```bash
# 1. 停止服務
docker-compose down

# 2. 拉取最新程式碼
git pull

# 3. 重新建置並啟動
docker-compose build
docker-compose up -d
```

## 📝 注意事項

- **本地開發**: 預設設定適合本機開發，不建議直接用於公開網路
- **資料備份**: 定期備份 `postgres-data` volume 和 `~/.clawdbot`
- **日誌管理**: 定期清理 `./logs` 目錄避免磁碟滿

## 🆘 支援

如有問題請檢查：
1. Docker 和 Docker Compose 版本
2. 系統可用記憶體（至少 2GB）
3. 端口 3456 和 5432 是否被佔用
4. `~/.clawdbot` 目錄是否存在且有讀取權限

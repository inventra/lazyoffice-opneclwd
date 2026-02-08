#!/bin/bash
# Virtual Office Docker 啟動腳本

set -e

echo "🏢 Virtual Office - Docker 部署"
echo "================================"
echo

# 檢查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 錯誤：未安裝 Docker"
    echo "請先安裝 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 錯誤：未安裝 Docker Compose"
    echo "請先安裝 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker 已安裝"
echo

# 檢查 .env 檔案
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 檔案"
    echo "📝 建立 .env 檔案..."
    cp .env.example .env
    echo "✅ .env 已建立（使用預設值）"
    echo "   建議修改 POSTGRES_PASSWORD"
    echo
fi

# 停止舊版本
echo "🛑 停止舊版本..."
docker-compose down 2>/dev/null || true
echo

# 建立映像檔
echo "🔨 建立 Docker 映像檔..."
docker-compose build
echo

# 啟動服務
echo "🚀 啟動服務..."
docker-compose up -d
echo

# 等待服務就緒
echo "⏳ 等待服務啟動..."
sleep 5

# 檢查狀態
echo "📊 服務狀態："
docker-compose ps
echo

# 測試連線
echo "🧪 測試應用..."
if curl -s http://localhost:3210/api/agents > /dev/null; then
    echo "✅ 應用正常運行"
    echo
    echo "🎉 部署成功！"
    echo
    echo "📍 訪問地址："
    echo "   http://localhost:3210"
    echo
    echo "📝 查看日誌："
    echo "   docker-compose logs -f"
    echo
    echo "🛑 停止服務："
    echo "   docker-compose down"
else
    echo "❌ 應用啟動失敗"
    echo
    echo "查看日誌："
    echo "   docker-compose logs"
    exit 1
fi

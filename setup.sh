#!/bin/bash
set -e

echo "🏢 Virtual Office 自動化設定開始..."

# 1. 檢查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 請先安裝 Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# 2. 檢查 .env
if [ ! -f .env ]; then
    echo "📝 建立 .env 檔案..."
    cp .env.example .env
fi

# 3. KIE.ai API Key（選填）
read -p "🎨 是否要使用 KIE.ai 生成 agent 圖片？(y/n) [n]: " use_kie
if [ "$use_kie" = "y" ]; then
    read -p "請輸入 KIE.ai API Key: " kie_key
    if [ -n "$kie_key" ]; then
        echo "KIE_AI_API_KEY=$kie_key" >> .env
        chmod 600 .env
        echo "✅ KIE.ai API Key 已設定"
    fi
else
    echo "ℹ️  將使用預設圖片"
fi

# 4. 啟動 Docker
echo "🐳 啟動 Docker 容器..."
docker-compose up -d

# 5. 等待資料庫啟動
echo "⏳ 等待資料庫啟動..."
sleep 5

# 6. 檢查服務狀態
if docker-compose ps | grep -q "Up"; then
    echo "✅ Virtual Office 已成功啟動！"
    echo ""
    echo "📍 訪問網址: http://127.0.0.1:3210"
    echo "🔐 SSE Token: 請查看容器日誌"
    echo ""
    echo "查看日誌: docker-compose logs app"
    echo "停止服務: docker-compose down"
else
    echo "❌ 啟動失敗，請檢查日誌: docker-compose logs"
    exit 1
fi

#!/bin/bash
# Virtual Office 整合測試腳本
# 自動檢查所有元件是否正常運作

echo "🔍 Virtual Office 整合檢查..."
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS=0
FAIL=0

check() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $1${NC}"
    ((SUCCESS++))
  else
    echo -e "${RED}❌ $1${NC}"
    ((FAIL++))
  fi
}

# 1. 檢查 Node.js
echo "1️⃣  檢查 Node.js..."
node --version > /dev/null 2>&1
check "Node.js 已安裝"

# 2. 檢查 PostgreSQL
echo "2️⃣  檢查 PostgreSQL..."
psql --version > /dev/null 2>&1
check "PostgreSQL 已安裝"

psql -d virtual_office -c "SELECT 1" > /dev/null 2>&1
check "資料庫 virtual_office 存在"

# 3. 檢查 Clawdbot agents
echo "3️⃣  檢查 Clawdbot agents..."
if [ -d "$HOME/.clawdbot/agents" ]; then
  AGENT_COUNT=$(ls -1 "$HOME/.clawdbot/agents" | wc -l | tr -d ' ')
  echo -e "${GREEN}✅ 找到 $AGENT_COUNT 個 agents${NC}"
  ((SUCCESS++))
else
  echo -e "${RED}❌ ~/.clawdbot/agents 不存在${NC}"
  ((FAIL++))
fi

# 4. 檢查服務運行
echo "4️⃣  檢查服務..."
if lsof -ti:3210 > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Virtual Office 運行中（Port 3210）${NC}"
  ((SUCCESS++))
else
  echo -e "${YELLOW}⚠️  Virtual Office 未運行${NC}"
  echo "   啟動指令: cd ~/Desktop/virtual-office && node server.js &"
fi

# 5. 檢查 API
echo "5️⃣  檢查 API..."
if curl -s --max-time 2 http://127.0.0.1:3210/api/agents > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API 正常回應${NC}"
  ((SUCCESS++))
else
  echo -e "${RED}❌ API 無回應${NC}"
  ((FAIL++))
fi

# 6. 檢查 Token API
echo "6️⃣  檢查 Token..."
TOKEN=$(curl -s --max-time 2 http://127.0.0.1:3210/api/token 2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✅ Token: ${TOKEN:0:20}...${NC}"
  ((SUCCESS++))
else
  echo -e "${RED}❌ 無法取得 Token${NC}"
  ((FAIL++))
fi

# 7. 檢查推送腳本
echo "7️⃣  檢查推送腳本..."
if [ -f "$HOME/scripts/vo-push.sh" ] && [ -x "$HOME/scripts/vo-push.sh" ]; then
  echo -e "${GREEN}✅ vo-push.sh 已安裝且可執行${NC}"
  ((SUCCESS++))
else
  echo -e "${RED}❌ vo-push.sh 不存在或不可執行${NC}"
  ((FAIL++))
fi

# 8. 測試推送
echo "8️⃣  測試推送..."
if [ -n "$TOKEN" ] && lsof -ti:3210 > /dev/null 2>&1; then
  PUSH_RESULT=$(curl -s --max-time 2 -X POST "http://127.0.0.1:3210/api/animation?token=$TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"type":"message_received","from":"test","to":"kevin","text":"整合測試"}' 2>&1)
  
  if echo "$PUSH_RESULT" | grep -q "ok\|OK" || [ -z "$PUSH_RESULT" ]; then
    echo -e "${GREEN}✅ 推送測試成功${NC}"
    ((SUCCESS++))
  else
    echo -e "${RED}❌ 推送測試失敗: $PUSH_RESULT${NC}"
    ((FAIL++))
  fi
else
  echo -e "${YELLOW}⚠️  跳過推送測試（服務未運行或無 token）${NC}"
fi

# 9. 檢查 SSE 連線
echo "9️⃣  檢查 SSE..."
if [ -n "$TOKEN" ]; then
  SSE_TEST=$(timeout 2 curl -s -N "http://127.0.0.1:3210/api/animation/stream?token=$TOKEN" 2>&1 | head -1)
  if [ -n "$SSE_TEST" ]; then
    echo -e "${GREEN}✅ SSE 連線正常${NC}"
    ((SUCCESS++))
  else
    echo -e "${YELLOW}⚠️  SSE 可能有問題（timeout）${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  跳過 SSE 測試（無 token）${NC}"
fi

# 總結
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "📊 測試結果: ${GREEN}${SUCCESS} 通過${NC} / ${RED}${FAIL} 失敗${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 恭喜！所有檢查都通過了！${NC}"
  echo ""
  echo "下一步："
  echo "1. 開啟瀏覽器: http://127.0.0.1:3210"
  echo "2. 檢查左上角是否顯示 LIVE 🟢"
  echo "3. 傳訊息給 Kevin 測試動畫"
  exit 0
else
  echo -e "${RED}⚠️  有 $FAIL 項檢查失敗${NC}"
  echo ""
  echo "建議："
  if ! lsof -ti:3210 > /dev/null 2>&1; then
    echo "- 啟動服務: cd ~/Desktop/virtual-office && node server.js &"
  fi
  if ! psql -d virtual_office -c "SELECT 1" > /dev/null 2>&1; then
    echo "- 建立資料庫: createdb virtual_office && psql -d virtual_office -f ~/Desktop/virtual-office/init-db.sql"
  fi
  exit 1
fi

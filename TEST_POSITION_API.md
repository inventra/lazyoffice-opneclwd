# Position Save/Load API 測試指南

## 🎯 API 端點

### POST /api/save
保存員工位置到資料庫

**Request:**
```json
{
  "offices": [{
    "sloths": [{
      "charId": "kevin",
      "leftPct": 30,
      "topPct": 40
    }]
  }],
  "currentId": "default",
  "customSloths": {}
}
```

**Response:**
```json
{
  "ok": true,
  "updated": 1
}
```

### GET /api/load
從資料庫載入員工位置

**Response:**
```json
{
  "offices": [{
    "sloths": [{
      "charId": "kevin",
      "leftPct": 30,
      "topPct": 40
    }]
  }],
  "currentId": "default",
  "customSloths": {}
}
```

## 🧪 測試方式

### 方法 1：使用 curl（命令列）

```bash
# 保存位置
curl -X POST http://127.0.0.1:3210/api/save \
  -H "Content-Type: application/json" \
  -d '{"offices":[{"sloths":[{"charId":"kevin","leftPct":30,"topPct":40}]}],"currentId":"default","customSloths":{}}'

# 載入位置
curl http://127.0.0.1:3210/api/load
```

### 方法 2：使用瀏覽器 Console

打開 http://127.0.0.1:3210，按 F12 打開 Console，然後執行：

```javascript
// 保存位置
fetch('/api/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    offices: [{
      sloths: [
        { charId: 'kevin', leftPct: 30, topPct: 40 },
        { charId: 'alex', leftPct: 50, topPct: 50 }
      ]
    }],
    currentId: 'default',
    customSloths: {}
  })
})
.then(res => res.json())
.then(data => console.log('Save result:', data));

// 載入位置
fetch('/api/load')
  .then(res => res.json())
  .then(data => console.log('Load result:', data));
```

## 🔧 前端整合建議

### 1. 自動保存（拖動結束後）

在前端的拖動結束事件中加入：

```javascript
// 假設你有一個 saveOfficeState() 函數
function saveOfficeState() {
  const currentState = {
    offices: [{
      sloths: getAllSlothPositions() // 取得所有角色的位置
    }],
    currentId: 'default',
    customSloths: {}
  };

  fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentState)
  })
  .then(res => res.json())
  .then(data => {
    if (data.ok) {
      console.log(`✅ Saved ${data.updated} positions`);
    }
  })
  .catch(err => console.error('Save failed:', err));
}

// 在拖動結束時呼叫
document.addEventListener('dragend', saveOfficeState);
```

### 2. 自動載入（頁面初始化）

在頁面載入時，從資料庫載入保存的位置：

```javascript
// 頁面載入時執行
window.addEventListener('DOMContentLoaded', () => {
  fetch('/api/load')
    .then(res => res.json())
    .then(data => {
      if (data.offices && data.offices[0] && data.offices[0].sloths) {
        applySlothPositions(data.offices[0].sloths);
      }
    })
    .catch(err => console.error('Load failed:', err));
});

function applySlothPositions(sloths) {
  sloths.forEach(sloth => {
    const element = document.querySelector(`[data-char-id="${sloth.charId}"]`);
    if (element) {
      element.style.left = `${sloth.leftPct}%`;
      element.style.top = `${sloth.topPct}%`;
    }
  });
}
```

## 📋 支援的員工 ID

| charId | 員工名稱 | 資料庫 ID |
|--------|---------|----------|
| kevin | Kevin | 7 |
| alex | Alex | 6 |
| lena | Lena | 8 |
| n8n_bot | N8N Bot | 11 |
| writer | Writer | 14 |
| main | Main | 10 |
| secguard | Security Guard | 12 |
| line-crm | LINE CRM | 9 |

## ⚠️ 注意事項

1. **座標範圍**：leftPct 和 topPct 會自動限制在 0-100 之間
2. **未知 charId**：如果傳入的 charId 不在映射表中，會被跳過（不會報錯）
3. **資料庫連線**：確保 PostgreSQL 正在運行且資料庫 `virtual_office` 已建立
4. **Transaction**：使用 PostgreSQL transaction 確保資料一致性

## 🐛 除錯

如果遇到問題，可以：

1. 檢查 server.log：`tail -f ~/Desktop/virtual-office/server.log`
2. 檢查資料庫：
   ```bash
   node -e "const { Pool } = require('pg'); const pool = new Pool({ database: 'virtual_office' }); pool.query('SELECT id, name, desk_x, desk_y FROM agents').then(r => { console.table(r.rows); pool.end(); });"
   ```
3. 測試 API 連線：`curl http://127.0.0.1:3210/api/load`

---

**測試完成日期**：2026-02-08  
**API 版本**：1.0  
**狀態**：✅ 已測試通過

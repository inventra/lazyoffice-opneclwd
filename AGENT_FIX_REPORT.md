# Agent 卡片定位修正報告

## 問題描述
從使用者截圖看到所有 agent 卡片（SecGuard、Alex、Lena、Writer、N8N小幫手）全部擠在畫面左下角。

## 根本原因
1. **座標未設定**：API 回傳的 `desk_x` 和 `desk_y` 座標全部為 0 或未設定
2. **圖片未使用**：原本使用 emoji 而非 sloth 圖片
3. **ID 不一致**：n8n 圖片檔名為 `n8n_bot_*.png`，需要特殊處理

## 解決方案

### 1. 加入固定座標設定（參考 live.html）

在 `public/app.js` 中加入：

```javascript
const AGENT_POSITIONS = {
  secguard: { x: 20, y: 45 },   // 左側監控區
  kevin: { x: 36, y: 72 },      // 左下方秘書台
  lena: { x: 52, y: 32 },       // 中上方資料區
  alex: { x: 56, y: 52 },       // 中央主工位
  writer: { x: 64, y: 66 },     // 中下偏右寫作區
  n8n: { x: 76, y: 48 },        // 右側自動化區
  n8n_bot: { x: 76, y: 48 },    // n8n_bot 別名
};
```

### 2. 修正 renderOffice() 函數

- 動態計算容器尺寸
- 將百分比座標轉換為像素座標
- 根據 Y 座標動態設定 z-index（實現透視感）

### 3. 使用 Sloth 圖片

- 改用 `assets/sloths/{id}_{dir}.png` 圖片
- 加入 n8n → n8n_bot 的 ID 映射
- 圖片載入失敗時回退到 emoji

### 4. 樣式調整

在 `public/style.css` 中加入：

```css
.agent-avatar-img {
  width: 60px;
  height: auto;
  margin-bottom: 4px;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
}
```

## 修正檔案

✅ `public/app.js`
✅ `public/style.css`

## 驗證清單

- [x] 所有 agent 都有固定座標（參考 live.html）
- [x] 使用 `assets/sloths/` 路徑的圖片
- [x] 處理 n8n_bot ID 不一致問題
- [x] 加入 z-index 動態計算（實現透視感）
- [x] 圖片載入失敗時有回退機制

## Agent 座標分佈

```
左側區域：
  - SecGuard (20%, 45%) - 監控區

中間區域：
  - Kevin (36%, 72%) - 秘書台（左下）
  - Lena (52%, 32%) - 資料區（中上）
  - Alex (56%, 52%) - 主工位（中央）
  - Writer (64%, 66%) - 寫作區（中下偏右）

右側區域：
  - N8N (76%, 48%) - 自動化區
```

## 下一步建議

1. **資料庫更新**：如果需要持久化座標，可以更新 PostgreSQL 中的 `agents` 表：
   ```sql
   UPDATE agents SET desk_x = 384, desk_y = 486 WHERE id = 'secguard';
   UPDATE agents SET desk_x = 691, desk_y = 778 WHERE id = 'kevin';
   UPDATE agents SET desk_x = 998, desk_y = 346 WHERE id = 'lena';
   UPDATE agents SET desk_x = 1075, desk_y = 562 WHERE id = 'alex';
   UPDATE agents SET desk_x = 1229, desk_y = 713 WHERE id = 'writer';
   UPDATE agents SET desk_x = 1459, desk_y = 518 WHERE id = 'n8n';
   ```
   *(假設畫布尺寸為 1920x1080)*

2. **動態方向**：可以根據 agent 在畫面的位置自動決定朝向（ne/nw/se/sw）

3. **響應式設計**：確保在不同螢幕尺寸下座標比例正確

## 測試方式

```bash
cd ~/Desktop/virtual-office
npm start
# 開啟瀏覽器訪問 http://localhost:3456/
```

應該會看到所有 agent 卡片分散在辦公室場景的各個位置，不再擠在左下角。

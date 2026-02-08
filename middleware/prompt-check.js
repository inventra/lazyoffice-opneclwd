const PromptGuard = require('../services/prompt-guard');

/**
 * Prompt 檢查中介層
 * 用於攔截可疑的 prompt injection 攻擊
 */
async function promptCheckMiddleware(pool) {
  return async function(req, res, next) {
    try {
      // 檢查是否啟用 Prompt Guard
      const settingsResult = await pool.query(
        'SELECT value FROM security_settings WHERE key = $1',
        ['prompt_guard_enabled']
      );

      const isEnabled = settingsResult.rows.length > 0 && 
                       settingsResult.rows[0].value === 'true';

      if (!isEnabled) {
        return next(); // 未啟用，直接通過
      }

      // 提取 prompt 文字（支援多種欄位名稱）
      const promptText = req.body.prompt || 
                        req.body.message || 
                        req.body.text ||
                        req.body.title ||
                        req.body.content;

      if (!promptText) {
        return next(); // 沒有 prompt 文字，直接通過
      }

      // 建立 PromptGuard 實例
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.warn('⚠️  Prompt Guard enabled but ANTHROPIC_API_KEY not set');
        return next();
      }

      const guard = new PromptGuard(apiKey);
      const agentId = req.body.agent_id || req.body.created_by || 'unknown';

      // 執行檢查
      const result = await guard.check(promptText, agentId);

      // 記錄審查結果
      const actionTaken = result.isSafe ? 'allowed' : 'blocked';
      await guard.logAudit(pool, agentId, promptText, result, actionTaken);

      // 判斷是否阻擋
      if (!result.isSafe && result.riskLevel !== 'low') {
        return res.status(400).json({
          error: 'Prompt injection detected',
          reason: result.reason,
          riskLevel: result.riskLevel,
          confidence: result.confidence,
          blocked: true
        });
      }

      // 如果只是低風險，記錄但通過
      if (result.riskLevel === 'low') {
        console.log(`⚠️  Low risk prompt detected: ${result.reason}`);
      }

      // 通過檢查
      next();

    } catch (error) {
      console.error('❌ Prompt check middleware error:', error);
      // 錯誤時預設通過（不要因為安全檢查失敗而阻擋所有請求）
      next();
    }
  };
}

module.exports = promptCheckMiddleware;

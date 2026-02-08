const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class PortScanner {
  constructor() {
    // 常見需要檢查的 ports
    this.commonPorts = [
      { port: 22, service: 'SSH', risk: 'medium' },
      { port: 80, service: 'HTTP', risk: 'low' },
      { port: 443, service: 'HTTPS', risk: 'low' },
      { port: 3306, service: 'MySQL', risk: 'high' },
      { port: 5432, service: 'PostgreSQL', risk: 'high' },
      { port: 27017, service: 'MongoDB', risk: 'high' },
      { port: 6379, service: 'Redis', risk: 'high' },
      { port: 8080, service: 'HTTP Alt', risk: 'medium' },
      { port: 3000, service: 'Node.js', risk: 'medium' },
      { port: 3210, service: 'Virtual Office', risk: 'low' }
    ];
  }

  async scanPort(port) {
    try {
      // 使用 nc (netcat) 檢查 port 是否開放
      // timeout 1 秒，如果連線成功則 port 開放
      const { stdout, stderr } = await execAsync(
        `nc -z -w 1 127.0.0.1 ${port}`,
        { timeout: 2000 }
      );
      
      return { port, status: 'open' };
    } catch (error) {
      // nc 回傳非 0 exit code 表示 port 關閉
      return { port, status: 'closed' };
    }
  }

  async scan() {
    const results = [];
    const startTime = Date.now();
    
    for (const portInfo of this.commonPorts) {
      const result = await this.scanPort(portInfo.port);
      results.push({
        ...result,
        service: portInfo.service,
        risk_level: result.status === 'open' ? portInfo.risk : 'safe'
      });
    }
    
    const duration = Date.now() - startTime;
    
    return {
      scanned_at: new Date().toISOString(),
      duration_ms: duration,
      total: results.length,
      open: results.filter(r => r.status === 'open').length,
      closed: results.filter(r => r.status === 'closed').length,
      results
    };
  }

  async getLastResult(pool) {
    const result = await pool.query(`
      SELECT DISTINCT ON (port) 
        port, status, service, risk_level, scanned_at
      FROM port_scan_results
      ORDER BY port, scanned_at DESC
    `);
    
    return result.rows;
  }

  async saveResult(pool, scanResult) {
    // 插入掃描結果到資料庫
    for (const item of scanResult.results) {
      await pool.query(
        `INSERT INTO port_scan_results (port, status, service, risk_level)
         VALUES ($1, $2, $3, $4)`,
        [item.port, item.status, item.service, item.risk_level]
      );
    }
    
    // 更新最後掃描時間
    await pool.query(
      `INSERT INTO security_settings (key, value)
       VALUES ('last_port_scan', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [new Date().toISOString()]
    );
    
    return scanResult;
  }
}

module.exports = PortScanner;

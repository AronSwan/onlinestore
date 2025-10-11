// TiDB health check script
// Usage: npm run tidb:health
// Reads both DB_* and DATABASE_* env vars. Requires mysql2.

const mysql = require('mysql2/promise');

function env(key, fallback) {
  return process.env[key] ?? fallback;
}

function pick(...keys) {
  for (const k of keys) {
    if (process.env[k] != null && process.env[k] !== '') return process.env[k];
  }
  return undefined;
}

(async () => {
  const startAll = process.hrtime.bigint();

  const host = pick('DB_HOST', 'DATABASE_HOST') || '127.0.0.1';
  const port = parseInt(pick('DB_PORT', 'DATABASE_PORT') || '4000', 10);
  const user = pick('DB_USERNAME', 'DATABASE_USERNAME') || 'caddy_app';
  const password = pick('DB_PASSWORD', 'DATABASE_PASSWORD') || 'your_secure_password_here';
  const database = pick('DB_DATABASE', 'DATABASE_NAME') || 'caddy_shopping_db';
  const timezone = pick('DB_TIMEZONE', 'DEFAULT_TIMEZONE') || '+08:00';
  const charset = pick('DB_CHARSET') || 'utf8mb4';

  const summary = { status: 'down', details: {}, errors: [] };

  let conn;
  try {
    const t0 = process.hrtime.bigint();
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      charset,
      timezone, // mysql2 maps '+08:00'
      connectTimeout: parseInt(pick('DB_CONNECTION_TIMEOUT', 'DATABASE_TIMEOUT') || '60000', 10),
      supportBigNumbers: true,
      bigNumberStrings: true,
      multipleStatements: false,
    });
    const t1 = process.hrtime.bigint();
    summary.details.connectMs = Number(t1 - t0) / 1_000_000;

    // Version
    const [verRows] = await conn.query('SELECT VERSION() as version');
    summary.details.version = verRows?.[0]?.version || 'unknown';

    // Timezone
    const [tzRows] = await conn.query('SELECT @@session.time_zone as tz');
    summary.details.sessionTimeZone = tzRows?.[0]?.tz;

    // Character set
    const [csRows] = await conn.query('SHOW VARIABLES LIKE "character_set_client"');
    summary.details.characterSetClient = csRows?.[0]?.Value;

    // Simple R/W
    const tTemp = Date.now();
    const tbl = `__health_tmp_${tTemp}`;
    const t2 = process.hrtime.bigint();
    await conn.query(
      `CREATE TABLE IF NOT EXISTS ${tbl} (id BIGINT PRIMARY KEY, note VARCHAR(255))`,
    );
    await conn.query(`INSERT INTO ${tbl} (id, note) VALUES (?, ?)`, [1, 'ok']);
    const [cntRows] = await conn.query(`SELECT COUNT(*) as cnt FROM ${tbl}`);
    await conn.query(`DROP TABLE ${tbl}`);
    const t3 = process.hrtime.bigint();

    summary.details.rwSucceeded = cntRows?.[0]?.cnt === 1;
    summary.details.rwMs = Number(t3 - t2) / 1_000_000;

    // Basic latency probe (single round-trip)
    const t4 = process.hrtime.bigint();
    await conn.query('SELECT 1');
    const t5 = process.hrtime.bigint();
    summary.details.pingMs = Number(t5 - t4) / 1_000_000;

    summary.status = 'up';
  } catch (err) {
    summary.errors.push(err.message || String(err));
    summary.status = 'down';
  } finally {
    try {
      if (conn) await conn.end();
    } catch (_) {}
  }

  const endAll = process.hrtime.bigint();
  summary.details.totalMs = Number(endAll - startAll) / 1_000_000;

  // Print compact JSON
  console.log(JSON.stringify(summary));
  process.exit(summary.status === 'up' ? 0 : 1);
})();

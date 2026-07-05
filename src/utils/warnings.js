const db = require("../database/mysql");

let tableReadyPromise = null;

async function ensureWarningsTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = db.query(`
      CREATE TABLE IF NOT EXISTS moderation_warnings (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        guildId VARCHAR(32) NOT NULL,
        userId VARCHAR(32) NOT NULL,
        moderatorId VARCHAR(32) NOT NULL,
        reason TEXT NOT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_guild_user (guildId, userId),
        INDEX idx_guild_active (guildId, active)
      )
    `);
  }

  await tableReadyPromise;
}

async function addWarning(guildId, userId, moderatorId, reason) {
  await ensureWarningsTable();

  const cleanReason = String(reason || "").trim();

  if (!cleanReason) {
    throw new Error("Warn-Grund fehlt.");
  }

  const [result] = await db.query(
    `
      INSERT INTO moderation_warnings
        (guildId, userId, moderatorId, reason, active)
      VALUES (?, ?, ?, ?, 1)
    `,
    [guildId, userId, moderatorId, cleanReason]
  );

  return {
    id: result.insertId,
    guildId,
    userId,
    moderatorId,
    reason: cleanReason
  };
}

async function getWarnings(guildId, userId) {
  await ensureWarningsTable();

  const [rows] = await db.query(
    `
      SELECT id, moderatorId, reason, active, createdAt
      FROM moderation_warnings
      WHERE guildId = ? AND userId = ?
      ORDER BY createdAt DESC
      LIMIT 25
    `,
    [guildId, userId]
  );

  return rows;
}

async function getActiveWarningCount(guildId, userId) {
  await ensureWarningsTable();

  const [rows] = await db.query(
    `
      SELECT COUNT(*) AS count
      FROM moderation_warnings
      WHERE guildId = ? AND userId = ? AND active = 1
    `,
    [guildId, userId]
  );

  return Number(rows[0]?.count || 0);
}

async function clearWarnings(guildId, userId) {
  await ensureWarningsTable();

  const [result] = await db.query(
    `
      UPDATE moderation_warnings
      SET active = 0
      WHERE guildId = ? AND userId = ? AND active = 1
    `,
    [guildId, userId]
  );

  return result.affectedRows || 0;
}

module.exports = {
  ensureWarningsTable,
  addWarning,
  getWarnings,
  getActiveWarningCount,
  clearWarnings
};

const db = require("../database/mysql");

let tableReadyPromise = null;

async function ensureModerationCasesTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = db.query(`
      CREATE TABLE IF NOT EXISTS moderation_cases (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        guildId VARCHAR(32) NOT NULL,
        actionType VARCHAR(64) NOT NULL,
        targetId VARCHAR(32) NOT NULL,
        moderatorId VARCHAR(32) NOT NULL,
        reason TEXT NOT NULL,
        details TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_guild_id (guildId, id),
        INDEX idx_guild_target (guildId, targetId),
        INDEX idx_guild_action (guildId, actionType)
      )
    `);
  }

  await tableReadyPromise;
}

function cleanText(value, fallback = "Kein Grund angegeben") {
  const text = String(value || "").trim();

  if (!text) {
    return fallback;
  }

  return text.slice(0, 1000);
}

async function createModerationCase(options) {
  await ensureModerationCasesTable();

  const guildId = String(options.guildId);
  const actionType = String(options.actionType || "unknown").toLowerCase();
  const targetId = String(options.targetId);
  const moderatorId = String(options.moderatorId);
  const reason = cleanText(options.reason);
  const details = options.details
    ? JSON.stringify(options.details).slice(0, 4000)
    : null;

  const [result] = await db.query(
    `
      INSERT INTO moderation_cases
        (guildId, actionType, targetId, moderatorId, reason, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [guildId, actionType, targetId, moderatorId, reason, details]
  );

  return {
    id: result.insertId,
    guildId,
    actionType,
    targetId,
    moderatorId,
    reason,
    details
  };
}

async function getModerationCase(guildId, caseId) {
  await ensureModerationCasesTable();

  const [rows] = await db.query(
    `
      SELECT id, guildId, actionType, targetId, moderatorId, reason, details, createdAt
      FROM moderation_cases
      WHERE guildId = ? AND id = ?
      LIMIT 1
    `,
    [guildId, caseId]
  );

  return rows[0] || null;
}

async function getRecentCases(guildId, limit = 10) {
  await ensureModerationCasesTable();

  const cleanLimit = Math.max(1, Math.min(25, Number(limit) || 10));

  const [rows] = await db.query(
    `
      SELECT id, actionType, targetId, moderatorId, reason, details, createdAt
      FROM moderation_cases
      WHERE guildId = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    [guildId, cleanLimit]
  );

  return rows;
}

async function getUserCases(guildId, targetId, limit = 10) {
  await ensureModerationCasesTable();

  const cleanLimit = Math.max(1, Math.min(25, Number(limit) || 10));

  const [rows] = await db.query(
    `
      SELECT id, actionType, targetId, moderatorId, reason, details, createdAt
      FROM moderation_cases
      WHERE guildId = ? AND targetId = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    [guildId, targetId, cleanLimit]
  );

  return rows;
}

async function updateModerationCaseReason(guildId, caseId, reason) {
  await ensureModerationCasesTable();

  const cleanReason = cleanText(reason);

  const [result] = await db.query(
    `
      UPDATE moderation_cases
      SET reason = ?
      WHERE guildId = ? AND id = ?
      LIMIT 1
    `,
    [cleanReason, guildId, caseId]
  );

  if (!result.affectedRows) {
    return null;
  }

  return getModerationCase(guildId, caseId);
}


async function getUserCaseStats(guildId, targetId) {
  await ensureModerationCasesTable();

  const [rows] = await db.query(
    `
      SELECT actionType, COUNT(*) AS count
      FROM moderation_cases
      WHERE guildId = ? AND targetId = ?
      GROUP BY actionType
    `,
    [guildId, targetId]
  );

  const stats = {
    total: 0,
    byAction: {}
  };

  for (const row of rows) {
    const actionType = row.actionType;
    const count = Number(row.count) || 0;

    stats.byAction[actionType] = count;
    stats.total += count;
  }

  return stats;
}

module.exports = {
  ensureModerationCasesTable,
  createModerationCase,
  getModerationCase,
  getRecentCases,
  getUserCases,
  getUserCaseStats,
  updateModerationCaseReason
};

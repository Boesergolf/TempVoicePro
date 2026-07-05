const db = require("../database/mysql");

let tableReadyPromise = null;

const DEFAULT_SETTINGS = {
  enabled: false,
  antiSpamEnabled: true,
  antiLinkEnabled: false,
  antiCapsEnabled: false,
  spamMessageLimit: 5,
  spamIntervalSeconds: 8,
  capsMinLength: 12,
  capsPercent: 70,
  autoWarnEnabled: true,
  timeoutEnabled: false,
  timeoutMinutes: 10
};

async function ensureAutoModSettingsTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = db.query(`
      CREATE TABLE IF NOT EXISTS automod_settings (
        guildId VARCHAR(32) NOT NULL PRIMARY KEY,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        antiSpamEnabled TINYINT(1) NOT NULL DEFAULT 1,
        antiLinkEnabled TINYINT(1) NOT NULL DEFAULT 0,
        antiCapsEnabled TINYINT(1) NOT NULL DEFAULT 0,
        spamMessageLimit INT NOT NULL DEFAULT 5,
        spamIntervalSeconds INT NOT NULL DEFAULT 8,
        capsMinLength INT NOT NULL DEFAULT 12,
        capsPercent INT NOT NULL DEFAULT 70,
        autoWarnEnabled TINYINT(1) NOT NULL DEFAULT 1,
        timeoutEnabled TINYINT(1) NOT NULL DEFAULT 0,
        timeoutMinutes INT NOT NULL DEFAULT 10,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }

  await tableReadyPromise;
}

function normalizeSettings(row) {
  if (!row) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    enabled: Boolean(row.enabled),
    antiSpamEnabled: Boolean(row.antiSpamEnabled),
    antiLinkEnabled: Boolean(row.antiLinkEnabled),
    antiCapsEnabled: Boolean(row.antiCapsEnabled),
    spamMessageLimit: Number(row.spamMessageLimit) || DEFAULT_SETTINGS.spamMessageLimit,
    spamIntervalSeconds: Number(row.spamIntervalSeconds) || DEFAULT_SETTINGS.spamIntervalSeconds,
    capsMinLength: Number(row.capsMinLength) || DEFAULT_SETTINGS.capsMinLength,
    capsPercent: Number(row.capsPercent) || DEFAULT_SETTINGS.capsPercent,
    autoWarnEnabled: Boolean(row.autoWarnEnabled),
    timeoutEnabled: Boolean(row.timeoutEnabled),
    timeoutMinutes: Number(row.timeoutMinutes) || DEFAULT_SETTINGS.timeoutMinutes
  };
}

async function getAutoModSettings(guildId) {
  await ensureAutoModSettingsTable();

  const [rows] = await db.query(
    `
      SELECT *
      FROM automod_settings
      WHERE guildId = ?
      LIMIT 1
    `,
    [guildId]
  );

  if (rows[0]) {
    return normalizeSettings(rows[0]);
  }

  await db.query(
    `
      INSERT IGNORE INTO automod_settings (guildId)
      VALUES (?)
    `,
    [guildId]
  );

  return { ...DEFAULT_SETTINGS };
}

async function updateAutoModSettings(guildId, changes) {
  await ensureAutoModSettingsTable();

  const current = await getAutoModSettings(guildId);
  const next = {
    ...current,
    ...changes
  };

  next.spamMessageLimit = Math.max(2, Math.min(20, Number(next.spamMessageLimit) || 5));
  next.spamIntervalSeconds = Math.max(3, Math.min(60, Number(next.spamIntervalSeconds) || 8));
  next.capsMinLength = Math.max(5, Math.min(200, Number(next.capsMinLength) || 12));
  next.capsPercent = Math.max(50, Math.min(100, Number(next.capsPercent) || 70));
  next.timeoutMinutes = Math.max(1, Math.min(40320, Number(next.timeoutMinutes) || 10));

  await db.query(
    `
      INSERT INTO automod_settings (
        guildId,
        enabled,
        antiSpamEnabled,
        antiLinkEnabled,
        antiCapsEnabled,
        spamMessageLimit,
        spamIntervalSeconds,
        capsMinLength,
        capsPercent,
        autoWarnEnabled,
        timeoutEnabled,
        timeoutMinutes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        enabled = VALUES(enabled),
        antiSpamEnabled = VALUES(antiSpamEnabled),
        antiLinkEnabled = VALUES(antiLinkEnabled),
        antiCapsEnabled = VALUES(antiCapsEnabled),
        spamMessageLimit = VALUES(spamMessageLimit),
        spamIntervalSeconds = VALUES(spamIntervalSeconds),
        capsMinLength = VALUES(capsMinLength),
        capsPercent = VALUES(capsPercent),
        autoWarnEnabled = VALUES(autoWarnEnabled),
        timeoutEnabled = VALUES(timeoutEnabled),
        timeoutMinutes = VALUES(timeoutMinutes)
    `,
    [
      guildId,
      next.enabled ? 1 : 0,
      next.antiSpamEnabled ? 1 : 0,
      next.antiLinkEnabled ? 1 : 0,
      next.antiCapsEnabled ? 1 : 0,
      next.spamMessageLimit,
      next.spamIntervalSeconds,
      next.capsMinLength,
      next.capsPercent,
      next.autoWarnEnabled ? 1 : 0,
      next.timeoutEnabled ? 1 : 0,
      next.timeoutMinutes
    ]
  );

  return next;
}

module.exports = {
  DEFAULT_SETTINGS,
  ensureAutoModSettingsTable,
  getAutoModSettings,
  updateAutoModSettings
};

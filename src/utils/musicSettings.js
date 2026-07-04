const db = require("../database/mysql");

function getDefaultVolumePercent() {
  const value = Number(process.env.MUSIC_DEFAULT_VOLUME_PERCENT || 20);

  if (Number.isNaN(value)) {
    return 20;
  }

  return clampVolumePercent(value);
}

function clampVolumePercent(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return 20;
  }

  return Math.max(1, Math.min(100, Math.round(number)));
}

const DEFAULT_VOLUME_PERCENT = getDefaultVolumePercent();

let tableReadyPromise = null;

async function ensureMusicSettingsTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = db.query(`
      CREATE TABLE IF NOT EXISTS music_settings (
        guildId VARCHAR(32) NOT NULL PRIMARY KEY,
        volumePercent INT NOT NULL DEFAULT 20,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }

  await tableReadyPromise;
}

async function getSavedVolumePercent(guildId) {
  await ensureMusicSettingsTable();

  const [rows] = await db.query(
    "SELECT volumePercent FROM music_settings WHERE guildId = ? LIMIT 1",
    [guildId]
  );

  if (rows.length > 0) {
    return clampVolumePercent(rows[0].volumePercent);
  }

  await saveVolumePercent(guildId, DEFAULT_VOLUME_PERCENT);

  return DEFAULT_VOLUME_PERCENT;
}

async function saveVolumePercent(guildId, volumePercent) {
  await ensureMusicSettingsTable();

  const cleanVolume = clampVolumePercent(volumePercent);

  await db.query(
    `
      INSERT INTO music_settings (guildId, volumePercent)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        volumePercent = VALUES(volumePercent),
        updatedAt = CURRENT_TIMESTAMP
    `,
    [guildId, cleanVolume]
  );

  return cleanVolume;
}

module.exports = {
  DEFAULT_VOLUME_PERCENT,
  clampVolumePercent,
  ensureMusicSettingsTable,
  getSavedVolumePercent,
  saveVolumePercent
};

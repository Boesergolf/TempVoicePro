const mysql = require("mysql2/promise");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const {
  DB_HOST = "localhost",
  DB_USER = "root",
  DB_PASS = "",
  DB_NAME = "tempvoice"
} = process.env;

function escapeIdentifier(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error("Ungültiger Datenbankname: " + name);
  }

  return "`" + name + "`";
}

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    `,
    [DB_NAME, tableName, columnName]
  );

  return rows.length > 0;
}

async function addColumnIfMissing(connection, tableName, columnName, definition) {
  const exists = await columnExists(connection, tableName, columnName);

  if (exists) {
    console.log("✅ Spalte vorhanden: " + tableName + "." + columnName);
    return;
  }

  await connection.query(
    "ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + definition
  );

  console.log("➕ Spalte erstellt: " + tableName + "." + columnName);
}

async function main() {
  const dbName = escapeIdentifier(DB_NAME);

  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    multipleStatements: false
  });

  console.log("🚀 Datenbank-Setup startet...");

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS ${dbName}
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci`
  );

  console.log("✅ Datenbank bereit: " + DB_NAME);

  await connection.query("USE " + dbName);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guildId VARCHAR(20) PRIMARY KEY,
      creatorChannelId VARCHAR(20),
      categoryId VARCHAR(20)
    )
  `);

  console.log("✅ Tabelle bereit: guild_settings");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS temp_channels (
      channelId VARCHAR(20) PRIMARY KEY,
      ownerId VARCHAR(20),
      guildId VARCHAR(20),
      createdAt BIGINT,
      panelChannelId VARCHAR(20) NULL,
      panelMessageId VARCHAR(20) NULL
    )
  `);

  console.log("✅ Tabelle bereit: temp_channels");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS temp_permissions (
      channelId VARCHAR(20) PRIMARY KEY,
      ownerId VARCHAR(20),
      coOwners TEXT
    )
  `);

  console.log("✅ Tabelle bereit: temp_permissions");

  await addColumnIfMissing(
    connection,
    "temp_channels",
    "panelChannelId",
    "VARCHAR(20) NULL"
  );

  await addColumnIfMissing(
    connection,
    "temp_channels",
    "panelMessageId",
    "VARCHAR(20) NULL"
  );

  await addColumnIfMissing(
    connection,
    "temp_channels",
    "isPermanent",
    "TINYINT(1) NOT NULL DEFAULT 0"
  );

  await connection.query(`
    CREATE TABLE IF NOT EXISTS music_playlists (
      id INT AUTO_INCREMENT PRIMARY KEY,
      guildId VARCHAR(20) NOT NULL,
      ownerKey VARCHAR(20) NOT NULL,
      scope VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      createdAt BIGINT NOT NULL,
      UNIQUE KEY uniq_music_playlist (guildId, ownerKey, scope, name)
    )
  `);

  console.log("✅ Tabelle bereit: music_playlists");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS music_playlist_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      playlistId INT NOT NULL,
      source VARCHAR(20) NOT NULL DEFAULT 'url',
      title VARCHAR(200) NULL,
      url TEXT NOT NULL,
      addedBy VARCHAR(20) NOT NULL,
      position INT NOT NULL,
      createdAt BIGINT NOT NULL,
      INDEX idx_playlist_position (playlistId, position),
      CONSTRAINT fk_music_playlist_items_playlist
        FOREIGN KEY (playlistId)
        REFERENCES music_playlists(id)
        ON DELETE CASCADE
    )
  `);

  console.log("✅ Tabelle bereit: music_playlist_items");


  await connection.query(`
    CREATE TABLE IF NOT EXISTS music_settings (
      guildId VARCHAR(32) NOT NULL PRIMARY KEY,
      volumePercent INT NOT NULL DEFAULT 20,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  console.log("✅ Tabelle music_settings geprüft/erstellt.");


  await connection.query(`
    CREATE TABLE IF NOT EXISTS radio_presets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      guildId VARCHAR(32) NOT NULL,
      userId VARCHAR(32) NOT NULL,
      name VARCHAR(200) NOT NULL,
      streamUrl TEXT NOT NULL,
      sourceUrl TEXT NULL,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      UNIQUE KEY uniq_radio_preset_user_name (guildId, userId, name),
      INDEX idx_radio_presets_guild_name (guildId, name)
    )
  `);

  console.log("✅ Tabelle radio_presets geprüft/erstellt.");


  await connection.query(`
    CREATE TABLE IF NOT EXISTS guild_modules (
      guildId VARCHAR(32) NOT NULL,
      moduleName VARCHAR(64) NOT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (guildId, moduleName)
    )
  `);

  console.log("✅ Tabelle guild_modules geprüft/erstellt.");


  await connection.query(`
    CREATE TABLE IF NOT EXISTS guild_moderation_settings (
      guildId VARCHAR(32) NOT NULL PRIMARY KEY,
      modLogChannelId VARCHAR(32) NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  console.log("✅ Tabelle guild_moderation_settings geprüft/erstellt.");


  await connection.query(`
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

  console.log("✅ Tabelle moderation_warnings geprüft/erstellt.");


  await connection.query(`
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

  console.log("✅ Tabelle moderation_cases geprüft/erstellt.");


  await connection.query(`
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

  console.log("✅ Tabelle automod_settings geprüft/erstellt.");

  await connection.end();

  console.log("✅ Datenbank-Setup erfolgreich abgeschlossen.");
}

main().catch(err => {
  console.error("❌ Datenbank-Setup Fehler:", err);
  process.exit(1);
});

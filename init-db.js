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
    CREATE TABLE IF NOT EXISTS guild_modules (
      guildId VARCHAR(32) NOT NULL,
      moduleName VARCHAR(64) NOT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (guildId, moduleName)
    )
  `);

  console.log("✅ Tabelle guild_modules geprüft/erstellt.");

  await connection.end();

  console.log("✅ Datenbank-Setup erfolgreich abgeschlossen.");
}

main().catch(err => {
  console.error("❌ Datenbank-Setup Fehler:", err);
  process.exit(1);
});

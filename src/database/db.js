const Database = require("better-sqlite3");

const db = new Database("database.sqlite");

// Tabellen erstellen
db.prepare(`
CREATE TABLE IF NOT EXISTS guild_settings (
  guildId TEXT PRIMARY KEY,
  categoryId TEXT,
  creatorChannelId TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS temp_channels (
  channelId TEXT PRIMARY KEY,
  ownerId TEXT,
  guildId TEXT,
  createdAt INTEGER
)
`).run();

module.exports = db;

db.prepare(`
CREATE TABLE IF NOT EXISTS temp_permissions (
  channelId TEXT PRIMARY KEY,
  ownerId TEXT,
  coOwners TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS temp_permissions (
  channelId TEXT PRIMARY KEY,
  ownerId TEXT,
  coOwners TEXT
)
`).run();
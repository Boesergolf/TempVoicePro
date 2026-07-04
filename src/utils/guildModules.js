const db = require("../database/mysql");

const DEFAULT_MODULES = {
  tempvoice: {
    name: "TempVoice",
    description: "Temporäre Voice Channels",
    enabled: true
  },
  music: {
    name: "Music",
    description: "Music Player und Queue",
    enabled: true
  },
  playlist: {
    name: "Playlist",
    description: "Gespeicherte Playlists",
    enabled: true
  },
  gluecksrad: {
    name: "Glücksrad",
    description: "Zufallsauswahl und Teams",
    enabled: true
  },
  panels: {
    name: "Panels",
    description: "Zentrale Bot-Panels",
    enabled: true
  },
  chatgpt: {
    name: "ChatGPT",
    description: "ChatGPT Slash Command",
    enabled: true
  },
  moderation: {
    name: "Moderation",
    description: "Moderation, Warns und Modlogs",
    enabled: false
  },
  leveling: {
    name: "Leveling",
    description: "XP, Level und Rangsystem",
    enabled: false
  },
  tickets: {
    name: "Tickets",
    description: "Support Tickets",
    enabled: false
  }
};

let tableReadyPromise = null;

async function ensureGuildModulesTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = db.query(`
      CREATE TABLE IF NOT EXISTS guild_modules (
        guildId VARCHAR(32) NOT NULL,
        moduleName VARCHAR(64) NOT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (guildId, moduleName)
      )
    `);
  }

  await tableReadyPromise;
}

function normalizeModuleName(moduleName) {
  return String(moduleName || "")
    .trim()
    .toLowerCase();
}

function getKnownModules() {
  return DEFAULT_MODULES;
}

function getDefaultModuleState(moduleName) {
  const key = normalizeModuleName(moduleName);
  const moduleInfo = DEFAULT_MODULES[key];

  if (!moduleInfo) {
    return true;
  }

  return Boolean(moduleInfo.enabled);
}

async function getGuildModules(guildId) {
  await ensureGuildModulesTable();

  const [rows] = await db.query(
    "SELECT moduleName, enabled FROM guild_modules WHERE guildId = ?",
    [guildId]
  );

  const saved = new Map();

  for (const row of rows) {
    saved.set(row.moduleName, Boolean(row.enabled));
  }

  const result = {};

  for (const [key, info] of Object.entries(DEFAULT_MODULES)) {
    result[key] = {
      key,
      name: info.name,
      description: info.description,
      enabled: saved.has(key) ? saved.get(key) : Boolean(info.enabled)
    };
  }

  return result;
}

async function isModuleEnabled(guildId, moduleName) {
  await ensureGuildModulesTable();

  const key = normalizeModuleName(moduleName);

  const [rows] = await db.query(
    "SELECT enabled FROM guild_modules WHERE guildId = ? AND moduleName = ? LIMIT 1",
    [guildId, key]
  );

  if (rows.length === 0) {
    return getDefaultModuleState(key);
  }

  return Boolean(rows[0].enabled);
}

async function setModuleEnabled(guildId, moduleName, enabled) {
  await ensureGuildModulesTable();

  const key = normalizeModuleName(moduleName);
  const cleanEnabled = enabled ? 1 : 0;

  if (!DEFAULT_MODULES[key]) {
    throw new Error("Unbekanntes Modul: " + moduleName);
  }

  await db.query(
    `
      INSERT INTO guild_modules (guildId, moduleName, enabled)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        enabled = VALUES(enabled),
        updatedAt = CURRENT_TIMESTAMP
    `,
    [guildId, key, cleanEnabled]
  );

  return {
    key,
    enabled: Boolean(cleanEnabled)
  };
}

module.exports = {
  DEFAULT_MODULES,
  ensureGuildModulesTable,
  getKnownModules,
  getGuildModules,
  isModuleEnabled,
  setModuleEnabled
};

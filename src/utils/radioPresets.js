const {
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const db = require("../database/mysql");

const searchCache = new Map();

function cleanName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function ensureRadioPresetsTable() {
  await db.query(`
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
}

async function saveRadioPreset({ guildId, userId, name, streamUrl, sourceUrl }) {
  const cleanPresetName = cleanName(name);

  if (!guildId || !userId || !cleanPresetName || !isHttpUrl(streamUrl)) {
    throw new Error("Ungültige Radio-Speicherdaten.");
  }

  await ensureRadioPresetsTable();

  const now = Date.now();

  await db.execute(
    `INSERT INTO radio_presets
       (guildId, userId, name, streamUrl, sourceUrl, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       streamUrl = VALUES(streamUrl),
       sourceUrl = VALUES(sourceUrl),
       updatedAt = VALUES(updatedAt)`,
    [
      guildId,
      userId,
      cleanPresetName,
      streamUrl,
      sourceUrl || streamUrl,
      now,
      now
    ]
  );

  const [rows] = await db.execute(
    `SELECT *
     FROM radio_presets
     WHERE guildId = ?
       AND userId = ?
       AND name = ?
     LIMIT 1`,
    [guildId, userId, cleanPresetName]
  );

  return rows[0] || null;
}

async function listRadioPresets(guildId, limit = 25) {
  await ensureRadioPresetsTable();

  const safeLimit = Math.max(1, Math.min(Number(limit) || 25, 25));
  const [rows] = await db.execute(
    `SELECT *
     FROM radio_presets
     WHERE guildId = ?
     ORDER BY updatedAt DESC, name ASC
     LIMIT ${safeLimit}`,
    [guildId]
  );

  return rows;
}

async function getRadioPresetById(guildId, id) {
  await ensureRadioPresetsTable();

  const [rows] = await db.execute(
    `SELECT *
     FROM radio_presets
     WHERE guildId = ?
       AND id = ?
     LIMIT 1`,
    [guildId, id]
  );

  return rows[0] || null;
}

async function searchLocalRadioPresets(guildId, query, limit = 10) {
  const cleanQuery = cleanName(query);

  if (!cleanQuery) {
    return [];
  }

  await ensureRadioPresetsTable();

  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 25));
  const [rows] = await db.execute(
    `SELECT *
     FROM radio_presets
     WHERE guildId = ?
       AND name LIKE ?
     ORDER BY updatedAt DESC, name ASC
     LIMIT ${safeLimit}`,
    [guildId, "%" + cleanQuery + "%"]
  );

  return rows;
}

async function fetchRadioBrowserResults(query, limit = 10) {
  const cleanQuery = cleanName(query);

  if (!cleanQuery) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 10));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const params = new URLSearchParams({
      name: cleanQuery,
      hidebroken: "true",
      order: "clickcount",
      reverse: "true",
      limit: String(safeLimit)
    });

    const response = await fetch(
      "https://all.api.radio-browser.info/json/stations/search?" + params.toString(),
      {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": "TempVoicePro Radio Search"
        }
      }
    );

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const rows = await response.json();

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map(row => {
        const streamUrl = row.url_resolved || row.url || "";
        const name = cleanName(row.name || row.stationuuid || "Radiostream");

        if (!name || !isHttpUrl(streamUrl)) {
          return null;
        }

        return {
          source: "radio-browser",
          name,
          streamUrl,
          sourceUrl: row.homepage || row.url || streamUrl,
          country: cleanName(row.country || ""),
          tags: cleanName(row.tags || "")
        };
      })
      .filter(Boolean)
      .slice(0, safeLimit);
  } catch (err) {
    console.warn("⚠️ Radio-Browser Suche fehlgeschlagen:", err.message);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function createSearchToken(results) {
  const token =
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);

  searchCache.set(token, {
    results,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  return token;
}

function getCachedSearchResult(token, index) {
  const cached = searchCache.get(token);

  if (!cached || cached.expiresAt < Date.now()) {
    searchCache.delete(token);
    return null;
  }

  return cached.results[Number(index)] || null;
}

function optionLabel(text, fallback) {
  return (cleanName(text) || fallback || "Radiostream").slice(0, 100);
}

function optionDescription(text) {
  return cleanName(text).slice(0, 100) || "Stream abspielen";
}

function createSavedPresetSelectMessage(presets) {
  const options = presets.slice(0, 25).map(preset => ({
    label: optionLabel(preset.name, "Gespeicherter Sender"),
    description: optionDescription(preset.streamUrl),
    value: String(preset.id)
  }));

  return {
    content: "📻 Gespeicherte Radiostreams auswählen:",
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("mp_radio_saved_select")
          .setPlaceholder("Gespeicherten Sender abspielen...")
          .addOptions(options)
      )
    ]
  };
}

function createSearchResultSelectMessage(query, results, sourceLabel) {
  const token = createSearchToken(results);
  const options = results.slice(0, 10).map((result, index) => ({
    label: optionLabel(result.name, "Radiostream"),
    description: optionDescription(
      sourceLabel + (result.country ? " • " + result.country : "")
    ),
    value: String(index)
  }));

  return {
    content:
      "📻 Suchergebnisse für **" + cleanName(query) + "**\n" +
      "Quelle: " + sourceLabel,
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("mp_radio_search_select:" + token)
          .setPlaceholder("Suchergebnis abspielen...")
          .addOptions(options)
      )
    ]
  };
}

module.exports = {
  ensureRadioPresetsTable,
  saveRadioPreset,
  listRadioPresets,
  getRadioPresetById,
  searchLocalRadioPresets,
  fetchRadioBrowserResults,
  getCachedSearchResult,
  createSavedPresetSelectMessage,
  createSearchResultSelectMessage
};

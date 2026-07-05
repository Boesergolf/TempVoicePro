const { EmbedBuilder } = require("discord.js");
const db = require("../database/mysql");

let tableReadyPromise = null;

async function ensureModLogTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = db.query(`
      CREATE TABLE IF NOT EXISTS guild_moderation_settings (
        guildId VARCHAR(32) NOT NULL PRIMARY KEY,
        modLogChannelId VARCHAR(32) NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }

  await tableReadyPromise;
}

async function getModLogSettings(guildId) {
  await ensureModLogTable();

  const [rows] = await db.query(
    "SELECT modLogChannelId, enabled FROM guild_moderation_settings WHERE guildId = ? LIMIT 1",
    [guildId]
  );

  if (rows.length === 0) {
    return {
      modLogChannelId: null,
      enabled: false
    };
  }

  return {
    modLogChannelId: rows[0].modLogChannelId,
    enabled: Boolean(rows[0].enabled)
  };
}

async function setModLogChannel(guildId, channelId) {
  await ensureModLogTable();

  await db.query(
    `
      INSERT INTO guild_moderation_settings (guildId, modLogChannelId, enabled)
      VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE
        modLogChannelId = VALUES(modLogChannelId),
        enabled = 1,
        updatedAt = CURRENT_TIMESTAMP
    `,
    [guildId, channelId]
  );
}

async function disableModLog(guildId) {
  await ensureModLogTable();

  await db.query(
    `
      INSERT INTO guild_moderation_settings (guildId, modLogChannelId, enabled)
      VALUES (?, NULL, 0)
      ON DUPLICATE KEY UPDATE
        enabled = 0,
        updatedAt = CURRENT_TIMESTAMP
    `,
    [guildId]
  );
}

async function sendModLog(guild, options) {
  const settings = await getModLogSettings(guild.id);

  if (!settings.enabled || !settings.modLogChannelId) {
    return false;
  }

  const channel = guild.channels.cache.get(settings.modLogChannelId);

  if (!channel) {
    return false;
  }

  const embed = new EmbedBuilder()
    .setTitle(options.title || "🛡 Moderation Log")
    .setColor(options.color || 0x5865f2)
    .setDescription(options.description || "Keine Beschreibung.")
    .setTimestamp();

  if (options.fields && Array.isArray(options.fields)) {
    embed.addFields(options.fields);
  }

  if (options.footer) {
    embed.setFooter({ text: options.footer });
  }

  await channel.send({ embeds: [embed] }).catch(() => {});

  return true;
}

module.exports = {
  ensureModLogTable,
  getModLogSettings,
  setModLogChannel,
  disableModLog,
  sendModLog
};

const { EmbedBuilder } = require("discord.js");
const db = require("../database/mysql");

async function getTempVoiceStats(guild) {
  const guildId = guild.id;

  let settings = null;
  let tempChannels = [];

  try {
    const [settingsRows] = await db.query(
      "SELECT creatorChannelId, categoryId FROM guild_settings WHERE guildId = ? LIMIT 1",
      [guildId]
    );

    settings = settingsRows[0] || null;
  } catch (err) {
    console.error("❌ TempVoice Panel Settings Fehler:", err.message);
  }

  try {
    const [rows] = await db.query(
      "SELECT channelId, ownerId, createdAt FROM temp_channels WHERE guildId = ? ORDER BY createdAt DESC LIMIT 10",
      [guildId]
    );

    tempChannels = rows || [];
  } catch (err) {
    console.error("❌ TempVoice Panel Channels Fehler:", err.message);
  }

  return {
    settings,
    tempChannels
  };
}

function mentionChannel(guild, channelId) {
  if (!channelId) return "Nicht gesetzt";

  const channel = guild.channels.cache.get(channelId);

  if (!channel) {
    return "`" + channelId + "` *(nicht gefunden)*";
  }

  return channel.toString();
}

function formatActiveChannels(guild, tempChannels) {
  if (!tempChannels || tempChannels.length === 0) {
    return "Keine aktiven TempVoice Channels.";
  }

  return tempChannels
    .map(row => {
      const channel = mentionChannel(guild, row.channelId);
      const owner = row.ownerId ? "<@" + row.ownerId + ">" : "Unbekannt";

      return "- " + channel + " | Owner: " + owner;
    })
    .join("\n")
    .slice(0, 1000);
}

async function createTempVoicePanelEmbed(guild) {
  const stats = await getTempVoiceStats(guild);

  const creator = stats.settings
    ? mentionChannel(guild, stats.settings.creatorChannelId)
    : "Nicht eingerichtet";

  const category = stats.settings
    ? mentionChannel(guild, stats.settings.categoryId)
    : "Nicht eingerichtet";

  const activeCount = stats.tempChannels.length;

  return new EmbedBuilder()
    .setTitle("🎧 TempVoice Status")
    .setColor(0x2ecc71)
    .setDescription("Live-Übersicht für das TempVoice System.")
    .addFields(
      {
        name: "Creator Channel",
        value: creator,
        inline: true
      },
      {
        name: "Kategorie",
        value: category,
        inline: true
      },
      {
        name: "Aktive TempVoice Channels",
        value: String(activeCount),
        inline: true
      },
      {
        name: "Aktive Lobbys",
        value: formatActiveChannels(guild, stats.tempChannels)
      }
    )
    .setFooter({
      text: "Aktualisierung über /panels"
    })
    .setTimestamp();
}

module.exports = {
  createTempVoicePanelEmbed
};

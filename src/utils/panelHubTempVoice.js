const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const db = require("../database/mysql");

function backRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_hub_tempvoice_refresh")
      .setLabel("Aktualisieren")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_hub_tempvoice_setup")
      .setLabel("Setup Hinweis")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_hub_home")
      .setLabel("Zurück")
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
  );
}

async function tableExists(tableName) {
  const [rows] = await db.execute(
    "SHOW TABLES LIKE ?",
    [tableName]
  );

  return rows.length > 0;
}

function pickChannelId(row) {
  return row.channelId ||
    row.voiceChannelId ||
    row.voiceId ||
    row.id ||
    null;
}

function pickOwnerId(row) {
  return row.ownerId ||
    row.userId ||
    row.creatorId ||
    null;
}

async function readTempVoiceRows(guildId) {
  const possibleTables = [
    "temp_channels",
    "temp_voice_channels",
    "temporary_channels"
  ];

  for (const table of possibleTables) {
    const exists = await tableExists(table).catch(() => false);

    if (!exists) {
      continue;
    }

    try {
      const [rows] = await db.execute(
        "SELECT * FROM " + table + " WHERE guildId = ? LIMIT 50",
        [guildId]
      );

      return {
        table,
        rows
      };
    } catch (error) {
      console.warn("⚠️ TempVoice Tabelle konnte nicht gelesen werden:", table, error.message);
    }
  }

  return {
    table: null,
    rows: []
  };
}

async function createTempVoiceCentralMessage(guild) {
  const result = await readTempVoiceRows(guild.id);

  const activeRows = [];

  for (const row of result.rows) {
    const channelId = pickChannelId(row);

    if (!channelId) {
      continue;
    }

    const channel = guild.channels.cache.get(String(channelId));

    if (!channel) {
      continue;
    }

    activeRows.push({
      row,
      channel,
      channelId: String(channelId),
      ownerId: pickOwnerId(row)
    });
  }

  const lines = activeRows.length
    ? activeRows.slice(0, 15).map((entry, index) => {
        const owner = entry.ownerId ? "<@" + entry.ownerId + ">" : "Unbekannt";
        const members = entry.channel.members ? entry.channel.members.size : 0;

        return (
          "**" + (index + 1) + ".** " +
          "<#" + entry.channelId + "> — Owner: " + owner +
          " — Mitglieder: **" + members + "**"
        );
      })
    : [
        "Aktuell wurden keine aktiven TempVoice-Räume gefunden.",
        "",
        "Sobald jemand dem Creator-Channel beitritt, sollte hier ein Raum erscheinen."
      ];

  const embed = new EmbedBuilder()
    .setTitle("🎙️ TempVoice")
    .setDescription(
      [
        "TempVoice-Übersicht direkt im Zentralpanel.",
        "",
        "**Aktive Räume:**",
        ...lines,
        "",
        "**Setup:**",
        "TempVoice wird mit `/setup` eingerichtet."
      ].join("\n")
    )
    .setColor(activeRows.length ? 0x22c55e : 0x5865f2)
    .addFields(
      {
        name: "Aktive Räume",
        value: String(activeRows.length),
        inline: true
      },
      {
        name: "Datenquelle",
        value: result.table || "keine Tabelle gefunden",
        inline: true
      }
    )
    .setFooter({ text: "TempVoicePro TempVoice Zentralpanel" })
    .setTimestamp();

  return {
    embeds: [embed],
    components: [backRow()]
  };
}

module.exports = {
  createTempVoiceCentralMessage
};

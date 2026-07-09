const {
  EmbedBuilder
} = require("discord.js");

const db = require("../database/mysql");

const {
  ensureTempChannelsPermanentColumn
} = require("./tempVoiceSchema");

function buildTempVoicePanelEmbed(channel, data) {
  const ownerId = data.ownerId || data.tempOwnerId || null;
  const ownerText = ownerId ? "<@" + ownerId + ">" : "Unbekannt";
  const isPermanent = Number(data.isPermanent || 0) === 1;
  const mode = isPermanent ? "Permanent" : "Temporär";

  return new EmbedBuilder()
    .setTitle("🎛 TempVoice Control Panel")
    .setColor(isPermanent ? "Green" : "Blue")
    .setDescription(
      "🎙 Channel: " + channel.toString() + "\n" +
      "🏷 Name: **" + channel.name + "**\n" +
      "👑 Owner: " + ownerText + "\n" +
      "📌 Modus: **" + mode + "**\n\n" +
      "Diese Panel-Nachricht wird automatisch gelöscht, wenn der Voice Channel gelöscht wird."
    );
}

async function getTempVoicePanelData(channelId) {
  await ensureTempChannelsPermanentColumn();

  const [rows] = await db.execute(
    `
      SELECT
        tc.channelId,
        tc.ownerId AS tempOwnerId,
        tc.guildId,
        tc.isPermanent,
        tc.panelChannelId,
        tc.panelMessageId,
        tp.ownerId
      FROM temp_channels tc
      LEFT JOIN temp_permissions tp
        ON tp.channelId = tc.channelId
      WHERE tc.channelId = ?
      LIMIT 1
    `,
    [channelId]
  );

  return rows[0] || null;
}

async function updateTempVoicePanelMessage(channel) {
  if (!channel || !channel.guild) {
    return false;
  }

  const data = await getTempVoicePanelData(channel.id);

  if (!data || !data.panelChannelId || !data.panelMessageId) {
    return false;
  }

  const panelChannel = await channel.guild.channels
    .fetch(data.panelChannelId)
    .catch(() => null);

  if (!panelChannel || !panelChannel.isTextBased()) {
    return false;
  }

  const panelMessage = await panelChannel.messages
    .fetch(data.panelMessageId)
    .catch(() => null);

  if (!panelMessage) {
    return false;
  }

  await panelMessage.edit({
    embeds: [buildTempVoicePanelEmbed(channel, data)]
  });

  return true;
}

module.exports = {
  buildTempVoicePanelEmbed,
  updateTempVoicePanelMessage
};

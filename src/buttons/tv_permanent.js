const db = require("../database/mysql");

const {
  hasAccess
} = require("../utils/permissions");

const {
  cancelDelete
} = require("../utils/tempChannels");

async function resolveTempChannel(interaction) {
  const voiceChannel = interaction.member?.voice?.channel || null;

  if (voiceChannel) {
    const [rows] = await db.execute(
      "SELECT * FROM temp_channels WHERE channelId = ? LIMIT 1",
      [voiceChannel.id]
    );

    if (rows[0]) {
      return {
        data: rows[0],
        channel: voiceChannel
      };
    }
  }

  const [panelRows] = await db.execute(
    "SELECT * FROM temp_channels WHERE panelChannelId = ? LIMIT 1",
    [interaction.channelId]
  );

  const data = panelRows[0];

  if (!data) {
    return null;
  }

  const channel = await interaction.guild.channels
    .fetch(data.channelId)
    .catch(() => null);

  return {
    data,
    channel
  };
}

module.exports = {
  customId: "tv_permanent",

  async execute(interaction) {
    const resolved = await resolveTempChannel(interaction);

    if (!resolved || !resolved.channel) {
      return interaction.reply({
        content: "❌ Kein TempVoice Channel gefunden.",
        flags: 64
      });
    }

    const allowed = await hasAccess(interaction.user.id, resolved.data.channelId);

    if (!allowed) {
      return interaction.reply({
        content: "❌ Nur Owner oder Co-Owner dürfen den Channel permanent machen.",
        flags: 64
      });
    }

    await db.execute(
      "UPDATE temp_channels SET isPermanent = 1 WHERE channelId = ?",
      [resolved.data.channelId]
    );

    cancelDelete(resolved.data.channelId);

    return interaction.reply({
      content:
        "📌 **" + resolved.channel.name + "** ist jetzt permanent.\n" +
        "Der Voice-Channel wird nicht mehr automatisch gelöscht, wenn er leer ist.",
      flags: 64
    });
  }
};

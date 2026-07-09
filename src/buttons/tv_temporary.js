const db = require("../database/mysql");

const {
  hasAccess
} = require("../utils/permissions");

const {
  handleEmptyChannel
} = require("../utils/tempChannels");

const {
  ensureTempChannelsPermanentColumn
} = require("../utils/tempVoiceSchema");

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
  customId: "tv_temporary",

  async execute(interaction) {
    await ensureTempChannelsPermanentColumn();

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
        content: "❌ Nur Owner oder Co-Owner dürfen den Channel wieder temporär machen.",
        flags: 64
      });
    }

    await db.execute(
      "UPDATE temp_channels SET isPermanent = 0 WHERE channelId = ?",
      [resolved.data.channelId]
    );

    if (resolved.channel.members && resolved.channel.members.size === 0) {
      handleEmptyChannel(resolved.channel);
    }

    return interaction.reply({
      content:
        "⏱ **" + resolved.channel.name + "** ist jetzt wieder temporär.\n" +
        "Wenn der Voice-Channel leer ist, wird er wieder automatisch gelöscht.",
      flags: 64
    });
  }
};

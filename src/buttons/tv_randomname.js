const db = require("../database/mysql");
const { hasAccess } = require("../utils/permissions");
const { pickRandomTempVoiceName } = require("../utils/tempVoiceNames");
const { updateTempVoicePanelMessage } = require("../utils/tempVoicePanelMessage");

async function resolveTempChannel(interaction) {
  const voiceChannel = interaction.member?.voice?.channel || null;

  if (voiceChannel) {
    const [rows] = await db.execute(
      "SELECT * FROM temp_channels WHERE channelId = ? LIMIT 1",
      [voiceChannel.id]
    );

    if (rows[0]) {
      return voiceChannel;
    }
  }

  if (interaction.message?.id) {
    const [rows] = await db.execute(
      "SELECT channelId FROM temp_channels WHERE panelMessageId = ? LIMIT 1",
      [interaction.message.id]
    );

    const data = rows[0];

    if (data && data.channelId) {
      return interaction.guild.channels
        .fetch(data.channelId)
        .catch(() => null);
    }
  }

  return null;
}

module.exports = {
  customId: "tv_randomname",

  async execute(interaction) {
    const channel = await resolveTempChannel(interaction);

    if (!channel) {
      return interaction.reply({
        content: "❌ Kein TempVoice Channel gefunden.",
        flags: 64
      });
    }

    const allowed = await hasAccess(interaction.user.id, channel.id);

    if (!allowed) {
      return interaction.reply({
        content: "❌ Nur Owner oder Co-Owner dürfen den Namen würfeln.",
        flags: 64
      });
    }

    const name = pickRandomTempVoiceName();

    await channel.setName(name);

    await updateTempVoicePanelMessage(channel).catch(error => {
      console.error("❌ TempVoice Zufallsname Panel Update Fehler:", error.message);
    });

    return interaction.reply({
      content: "🎲 Zufallsname gesetzt: **" + name + "**",
      flags: 64
    });
  }
};

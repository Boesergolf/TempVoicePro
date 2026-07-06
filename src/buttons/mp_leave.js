const { getVoiceConnection } = require("@discordjs/voice");
const { stopMusic } = require("../utils/musicPlayer");
const { createMusicCentralMessage } = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_leave",

  async execute(interaction) {
    await interaction.deferUpdate().catch(() => null);

    const guild = interaction.guild;

    const botMember =
      guild.members.me ||
      await guild.members.fetchMe().catch(() => null);

    const botVoiceChannel =
      botMember &&
      botMember.voice &&
      botMember.voice.channel
        ? botMember.voice.channel
        : null;

    const connection = getVoiceConnection(guild.id);

    stopMusic(guild.id);

    if (connection) {
      connection.destroy();
    }

    if (botVoiceChannel && botMember && botMember.voice) {
      await botMember.voice.disconnect().catch(() => {});
    }

    await interaction.message.edit(
      createMusicCentralMessage(interaction.guild.id)
    ).catch(() => null);
  }
};

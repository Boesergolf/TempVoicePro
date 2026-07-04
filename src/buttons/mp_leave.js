const { getVoiceConnection } = require("@discordjs/voice");
const { stopMusic } = require("../utils/musicPlayer");
const { refreshMusicPanelMessage } = require("../utils/musicPanelView");

module.exports = {
  customId: "mp_leave",

  async execute(interaction) {
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

    let left = false;

    if (connection) {
      connection.destroy();
      left = true;
    }

    if (botVoiceChannel && botMember && botMember.voice) {
      await botMember.voice.disconnect().catch(() => {});
      left = true;
    }

    await refreshMusicPanelMessage(interaction);

    if (left) {
      return interaction.reply({
        content: "👋 Bot hat den Voice Channel verlassen.",
        flags: 64
      });
    }

    return interaction.reply({
      content: "❌ Der Bot ist aktuell in keinem Voice Channel.",
      flags: 64
    });
  }
};

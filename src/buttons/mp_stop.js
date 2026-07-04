const { stopMusic } = require("../utils/musicPlayer");
const { refreshMusicPanelMessage } = require("../utils/musicPanelView");

module.exports = {
  customId: "mp_stop",

  async execute(interaction) {
    const stopped = stopMusic(interaction.guild.id);

    await refreshMusicPanelMessage(interaction);

    return interaction.reply({
      content: stopped
        ? "⏹ Musik gestoppt."
        : "❌ Es läuft aktuell keine Musik.",
      flags: 64
    });
  }
};

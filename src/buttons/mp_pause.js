const { pauseMusic } = require("../utils/musicPlayer");
const { refreshMusicPanelMessage } = require("../utils/musicPanelView");

module.exports = {
  customId: "mp_pause",

  async execute(interaction) {
    const paused = pauseMusic(interaction.guild.id);

    await refreshMusicPanelMessage(interaction);

    return interaction.reply({
      content: paused
        ? "⏸ Musik pausiert."
        : "❌ Es läuft aktuell keine Musik.",
      flags: 64
    });
  }
};

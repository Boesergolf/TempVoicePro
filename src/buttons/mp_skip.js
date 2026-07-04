const { skipTrack } = require("../utils/musicPlayer");
const { refreshMusicPanelMessage } = require("../utils/musicPanelView");

module.exports = {
  customId: "mp_skip",

  async execute(interaction) {
    const skipped = skipTrack(interaction.guild.id);

    setTimeout(() => {
      refreshMusicPanelMessage(interaction).catch(() => {});
    }, 1000);

    return interaction.reply({
      content: skipped
        ? "⏭ Track wurde übersprungen."
        : "❌ Es läuft aktuell keine Musik.",
      flags: 64
    });
  }
};

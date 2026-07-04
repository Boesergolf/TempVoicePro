const { resumeMusic } = require("../utils/musicPlayer");
const { refreshMusicPanelMessage } = require("../utils/musicPanelView");

module.exports = {
  customId: "mp_resume",

  async execute(interaction) {
    const resumed = resumeMusic(interaction.guild.id);

    await refreshMusicPanelMessage(interaction);

    return interaction.reply({
      content: resumed
        ? "▶️ Musik läuft weiter."
        : "❌ Es läuft aktuell keine pausierte Musik.",
      flags: 64
    });
  }
};

const { resumeMusic } = require("../utils/musicPlayer");

module.exports = {
  customId: "mp_resume",

  async execute(interaction) {
    const resumed = resumeMusic(interaction.guild.id);

    return interaction.reply({
      content: resumed
        ? "▶️ Musik läuft weiter."
        : "❌ Es läuft aktuell keine pausierte Musik.",
      ephemeral: true
    });
  }
};

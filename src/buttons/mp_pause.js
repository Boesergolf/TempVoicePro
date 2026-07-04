const { pauseMusic } = require("../utils/musicPlayer");

module.exports = {
  customId: "mp_pause",

  async execute(interaction) {
    const paused = pauseMusic(interaction.guild.id);

    return interaction.reply({
      content: paused
        ? "⏸ Musik pausiert."
        : "❌ Es läuft aktuell keine Musik.",
      ephemeral: true
    });
  }
};

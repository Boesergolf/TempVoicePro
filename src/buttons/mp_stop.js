const { stopMusic } = require("../utils/musicPlayer");

module.exports = {
  customId: "mp_stop",

  async execute(interaction) {
    const stopped = stopMusic(interaction.guild.id);

    return interaction.reply({
      content: stopped
        ? "⏹ Musik gestoppt."
        : "❌ Es läuft aktuell keine Musik.",
      ephemeral: true
    });
  }
};

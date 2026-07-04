const { skipTrack } = require("../utils/musicPlayer");

module.exports = {
  customId: "mp_skip",

  async execute(interaction) {
    const skipped = skipTrack(interaction.guild.id);

    return interaction.reply({
      content: skipped
        ? "⏭ Track wurde übersprungen."
        : "❌ Es läuft aktuell keine Musik.",
      ephemeral: true
    });
  }
};

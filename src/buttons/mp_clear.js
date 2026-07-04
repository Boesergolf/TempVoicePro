const { clearQueue } = require("../utils/musicPlayer");

module.exports = {
  customId: "mp_clear",

  async execute(interaction) {
    const count = clearQueue(interaction.guild.id);

    return interaction.reply({
      content: count > 0
        ? "🧹 Queue geleert. Entfernte Tracks: **" + count + "**"
        : "❌ Die Queue ist bereits leer.",
      ephemeral: true
    });
  }
};

const { shuffleQueue } = require("../utils/musicPlayer");

module.exports = {
  customId: "mp_shuffle",

  async execute(interaction) {
    const shuffled = shuffleQueue(interaction.guild.id);

    return interaction.reply({
      content: shuffled
        ? "🔀 Queue wurde gemischt."
        : "❌ Es sind nicht genug Tracks in der Queue.",
      ephemeral: true
    });
  }
};

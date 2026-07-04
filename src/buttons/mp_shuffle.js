const { shuffleQueue } = require("../utils/musicPlayer");
const { refreshMusicPanelMessage } = require("../utils/musicPanelView");

module.exports = {
  customId: "mp_shuffle",

  async execute(interaction) {
    const shuffled = shuffleQueue(interaction.guild.id);

    await refreshMusicPanelMessage(interaction);

    return interaction.reply({
      content: shuffled
        ? "🔀 Queue wurde gemischt."
        : "❌ Es sind nicht genug Tracks in der Queue.",
      flags: 64
    });
  }
};

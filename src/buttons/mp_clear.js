const { clearQueue } = require("../utils/musicPlayer");
const { refreshMusicPanelMessage } = require("../utils/musicPanelView");

module.exports = {
  customId: "mp_clear",

  async execute(interaction) {
    const count = clearQueue(interaction.guild.id);

    await refreshMusicPanelMessage(interaction);

    return interaction.reply({
      content: count > 0
        ? "🧹 Queue geleert. Entfernte Tracks: **" + count + "**"
        : "❌ Die Queue ist bereits leer.",
      flags: 64
    });
  }
};

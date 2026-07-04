const { clearHistory } = require("../utils/musicPlayer");
const { refreshMusicPanelMessage } = require("../utils/musicPanelView");

module.exports = {
  customId: "mp_clearhistory",

  async execute(interaction) {
    const count = clearHistory(interaction.guild.id);

    await refreshMusicPanelMessage(interaction);

    return interaction.reply({
      content: count > 0
        ? "🗑 History geleert. Entfernte Einträge: **" + count + "**"
        : "📜 Die History ist bereits leer.",
      flags: 64
    });
  }
};

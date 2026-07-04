const {
  createMusicPanelEmbed,
  createMusicPanelRows
} = require("../utils/musicPanelView");

module.exports = {
  customId: "mp_refresh",

  async execute(interaction) {
    await interaction.update({
      embeds: [createMusicPanelEmbed(interaction.guild.id)],
      components: createMusicPanelRows()
    });
  }
};

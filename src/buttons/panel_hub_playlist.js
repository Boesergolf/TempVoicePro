const { createPlaylistPanelMessage } = require("../utils/playlistPanel");

module.exports = {
  customId: "panel_hub_playlist",

  async execute(interaction) {
    return interaction.update(createPlaylistPanelMessage());
  }
};

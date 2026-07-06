const { showPlaylistSelect } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "playlist_panel_select",

  async execute(interaction) {
    return showPlaylistSelect(interaction);
  }
};

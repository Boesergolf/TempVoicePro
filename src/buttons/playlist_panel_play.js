const { showPlayModal } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "playlist_panel_play",
  async execute(interaction) {
    return showPlayModal(interaction);
  }
};

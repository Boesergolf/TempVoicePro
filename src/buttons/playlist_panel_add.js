const { showAddModal } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "playlist_panel_add",
  async execute(interaction) {
    return showAddModal(interaction);
  }
};

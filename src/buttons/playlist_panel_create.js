const { showCreateModal } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "playlist_panel_create",
  async execute(interaction) {
    return showCreateModal(interaction);
  }
};

const { showDeleteModal } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "playlist_panel_delete",
  async execute(interaction) {
    return showDeleteModal(interaction);
  }
};

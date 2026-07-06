const { showImportModal } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "playlist_panel_import",
  async execute(interaction) {
    return showImportModal(interaction);
  }
};

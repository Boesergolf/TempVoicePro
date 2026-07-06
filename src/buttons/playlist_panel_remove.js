const { showRemoveModal } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "playlist_panel_remove",

  async execute(interaction) {
    return showRemoveModal(interaction);
  }
};

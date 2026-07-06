const { handleRefresh } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "playlist_panel_refresh",
  async execute(interaction) {
    return handleRefresh(interaction);
  }
};

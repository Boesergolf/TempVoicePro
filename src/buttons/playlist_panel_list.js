const { handleList } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "playlist_panel_list",
  async execute(interaction) {
    return handleList(interaction);
  }
};

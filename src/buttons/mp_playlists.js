const { handleList } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "mp_playlists",

  async execute(interaction) {
    return handleList(interaction);
  }
};

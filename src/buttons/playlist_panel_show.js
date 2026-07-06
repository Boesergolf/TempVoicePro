const { showShowModal } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "playlist_panel_show",

  async execute(interaction) {
    return showShowModal(interaction);
  }
};

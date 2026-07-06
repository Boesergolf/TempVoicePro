const { showPlayModal } = require("../utils/playlistPanelActions");

module.exports = {
  customId: "mp_playlist",

  async execute(interaction) {
    return showPlayModal(interaction);
  }
};

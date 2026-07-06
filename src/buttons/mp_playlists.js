const {
  createPlaylistPanelMessage
} = require("../utils/playlistPanel");

module.exports = {
  customId: "mp_playlists",

  async execute(interaction) {
    return interaction.update(createPlaylistPanelMessage());
  }
};

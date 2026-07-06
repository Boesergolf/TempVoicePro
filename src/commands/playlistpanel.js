const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  createPlaylistPanelMessage
} = require("../utils/playlistPanel");

const {
  replyWithCentralPanelView
} = require("../utils/panelHubController");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("playlistpanel")
    .setDescription("Schaltet das Zentralpanel auf Playlist-Verwaltung.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    return replyWithCentralPanelView(
      interaction,
      createPlaylistPanelMessage(),
      "Playlist-Verwaltung"
    );
  }
};

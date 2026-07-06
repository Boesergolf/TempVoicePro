const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  createPlaylistPanelMessage
} = require("../utils/playlistPanel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("playlistpanel")
    .setDescription("Erstellt das Playlist-Verwaltungs-Panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.reply({
      content: "🎵 Playlist-Panel wird erstellt...",
      ephemeral: true
    });

    await interaction.channel.send(createPlaylistPanelMessage());

    await interaction.editReply({
      content: "✅ Playlist-Panel wurde erstellt."
    });
  }
};

module.exports = {
  customId: "panel_hub_playlist",

  async execute(interaction) {
    return interaction.reply({
      content:
        "🎚️ **Playlist Panel**\n\n" +
        "Zum Erstellen oder Aktualisieren nutze:\n" +
        "`/playlistpanel`",
      flags: 64
    });
  }
};

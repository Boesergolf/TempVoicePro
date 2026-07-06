module.exports = {
  customId: "panel_hub_music",

  async execute(interaction) {
    return interaction.reply({
      content:
        "🎵 **Music Panel**\n\n" +
        "Zum Erstellen oder Aktualisieren nutze:\n" +
        "`/musicpanel`",
      flags: 64
    });
  }
};

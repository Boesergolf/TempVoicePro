module.exports = {
  customId: "panel_hub_help",

  async execute(interaction) {
    return interaction.reply({
      content:
        "🧭 **TempVoicePro Kontrollzentrum**\n\n" +
        "Empfohlene Panel-Reihenfolge:\n" +
        "`/panelhub`\n" +
        "`/musicpanel`\n" +
        "`/playlistpanel`\n" +
        "`/gluecksradpanel`\n" +
        "`/panels`\n\n" +
        "Zum Aufräumen:\n" +
        "`/panelcleanup`",
      flags: 64
    });
  }
};

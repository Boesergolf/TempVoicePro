module.exports = {
  customId: "panel_hub_gluecksrad",

  async execute(interaction) {
    return interaction.reply({
      content:
        "🎡 **Glücksrad Panel**\n\n" +
        "Zum Erstellen nutze:\n" +
        "`/gluecksradpanel`",
      flags: 64
    });
  }
};

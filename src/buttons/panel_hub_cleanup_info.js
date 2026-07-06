module.exports = {
  customId: "panel_hub_cleanup_info",

  async execute(interaction) {
    return interaction.reply({
      content:
        "🧹 **Panel-Channel automatisch aufräumen**\n\n" +
        "Empfohlen:\n" +
        "`/panelrebuild confirm:True`\n\n" +
        "Das löscht alte Bot-Panel-Nachrichten im aktuellen Channel und baut die wichtigsten Panels sauber neu auf.\n\n" +
        "Normale User-Nachrichten werden standardmäßig nicht gelöscht.\n" +
        "Wenn du wirklich alles aufräumen willst:\n" +
        "`/panelrebuild confirm:True user_messages:True`",
      flags: 64
    });
  }
};

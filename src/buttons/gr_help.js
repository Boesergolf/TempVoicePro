module.exports = {
  customId: "gr_help",

  async execute(interaction) {
    return interaction.reply({
      content:
        "🎡 **Glücksrad Hilfe**\n\n" +
        "**Eigene Liste drehen:**\n" +
        "Nutze den Button `🎡 Eigene Liste drehen` und gib Maps, Karten oder Namen ein.\n\n" +
        "**Voice Auswahl:**\n" +
        "Nutze das Dropdown, während du in einem Voice Channel bist.\n\n" +
        "**Teams:**\n" +
        "Das Dropdown kann automatisch 2 oder 3 Teams aus deinem Voice Channel bilden.",
      flags: 64
    });
  }
};

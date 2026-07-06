module.exports = {
  customId: "panel_hub_tempvoice_setup",

  async execute(interaction) {
    return interaction.reply({
      content:
        "⚙️ **TempVoice Setup**\n\n" +
        "Nutze zum Einrichten:\n" +
        "`/setup`\n\n" +
        "Danach erstellt der Bot einen Creator-Channel. Wenn jemand beitritt, wird automatisch ein temporärer Voice-Channel erstellt.",
      flags: 64
    });
  }
};

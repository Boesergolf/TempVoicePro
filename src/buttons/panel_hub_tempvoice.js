module.exports = {
  customId: "panel_hub_tempvoice",

  async execute(interaction) {
    return interaction.reply({
      content:
        "🎙️ **TempVoice**\n\n" +
        "TempVoice wird mit `/setup` eingerichtet.\n" +
        "Status- und Modulpanels kommen über `/panels`.",
      flags: 64
    });
  }
};

const { MessageFlags } = require("discord.js");

const {
  updateGuildPanels
} = require("../utils/panelAutoRefresh");

module.exports = {
  customId: "panel_refresh",

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    try {
      await updateGuildPanels(interaction.guild);

      return interaction.editReply(
        "✅ Panels wurden aktualisiert."
      );
    } catch (err) {
      console.error("❌ Panel Refresh Button Fehler:", err.message);

      return interaction.editReply(
        "❌ Panels konnten nicht aktualisiert werden."
      );
    }
  }
};

const {
  listRadioPresets,
  createSavedPresetSelectMessage
} = require("../utils/radioPresets");
const {
  replyEphemeral
} = require("../utils/interactionReplies");

module.exports = {
  customId: "mp_radio_saved",

  async execute(interaction) {
    try {
      const presets = await listRadioPresets(interaction.guild.id, 25);

      if (presets.length === 0) {
        return replyEphemeral(interaction, "📭 Noch keine Radiostreams gespeichert.");
      }

      return replyEphemeral(interaction, createSavedPresetSelectMessage(presets));
    } catch (err) {
      console.error("❌ Gespeicherte Radio-Streams Fehler:", err.message);
      return replyEphemeral(
        interaction,
        "❌ Gespeicherte Radiostreams konnten nicht geladen werden."
      );
    }
  }
};

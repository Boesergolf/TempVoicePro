const {
  createMusicRadioCentralMessage
} = require("../utils/panelHubMusic");

const {
  getRadio
} = require("../utils/radioPlayer");

const {
  saveRadioPreset
} = require("../utils/radioPresets");
const {
  replyEphemeral
} = require("../utils/interactionReplies");

module.exports = {
  customId: "mp_radio_save",

  async execute(interaction) {
    const radio = getRadio(interaction.guild.id);

    if (!radio) {
      return replyEphemeral(
        interaction,
        "📻 Es läuft aktuell kein Radio, das gespeichert werden kann."
      );
    }

    try {
      const preset = await saveRadioPreset({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        name: radio.title,
        streamUrl: radio.streamUrl,
        sourceUrl: radio.originalUrl
      });

      await replyEphemeral(
        interaction,
        "💾 Radiostream gespeichert: **" + (preset?.name || radio.title) + "**"
      );

      return interaction.message.edit(
        createMusicRadioCentralMessage(interaction.guild.id)
      ).catch(() => null);
    } catch (err) {
      console.error("❌ Radio Speichern Fehler:", err.message);
      return replyEphemeral(
        interaction,
        "❌ Radiostream konnte nicht gespeichert werden."
      );
    }
  }
};

const {
  createTempVoiceCentralMessage
} = require("../utils/panelHubTempVoice");

module.exports = {
  customId: "panel_hub_tempvoice_refresh",

  async execute(interaction) {
    const message = await createTempVoiceCentralMessage(interaction.guild);

    return interaction.update(message);
  }
};

const { createTempVoiceHubMessage } = require("../utils/panelHub");

module.exports = {
  customId: "panel_hub_tempvoice",

  async execute(interaction) {
    return interaction.update(createTempVoiceHubMessage());
  }
};

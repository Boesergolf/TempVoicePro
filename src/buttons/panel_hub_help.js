const { createHelpHubMessage } = require("../utils/panelHub");

module.exports = {
  customId: "panel_hub_help",

  async execute(interaction) {
    return interaction.update(createHelpHubMessage());
  }
};

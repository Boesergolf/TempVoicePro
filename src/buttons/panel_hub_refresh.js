const { createPanelHubMessage } = require("../utils/panelHub");

module.exports = {
  customId: "panel_hub_refresh",

  async execute(interaction) {
    return interaction.update(createPanelHubMessage());
  }
};

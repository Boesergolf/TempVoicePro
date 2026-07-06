const { createCleanupHubMessage } = require("../utils/panelHub");

module.exports = {
  customId: "panel_hub_cleanup_info",

  async execute(interaction) {
    return interaction.update(createCleanupHubMessage());
  }
};

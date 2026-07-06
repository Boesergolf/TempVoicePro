const { createModulesHubMessage } = require("../utils/panelHub");

module.exports = {
  customId: "panel_hub_modules",

  async execute(interaction) {
    return interaction.update(createModulesHubMessage());
  }
};

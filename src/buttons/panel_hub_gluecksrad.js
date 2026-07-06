const { createGluecksradHubMessage } = require("../utils/panelHub");

module.exports = {
  customId: "panel_hub_gluecksrad",

  async execute(interaction) {
    return interaction.update(createGluecksradHubMessage());
  }
};

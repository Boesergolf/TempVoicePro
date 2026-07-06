const { createMusicHubMessage } = require("../utils/panelHub");

module.exports = {
  customId: "panel_hub_music",

  async execute(interaction) {
    return interaction.update(createMusicHubMessage());
  }
};

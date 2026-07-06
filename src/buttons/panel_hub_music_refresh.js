const {
  createMusicCentralMessage
} = require("../utils/panelHubMusic");

module.exports = {
  customId: "panel_hub_music_refresh",

  async execute(interaction) {
    return interaction.update(
      createMusicCentralMessage(interaction.guild.id)
    );
  }
};

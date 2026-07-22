const {
  createMusicRadioCentralMessage
} = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_radio",

  async execute(interaction) {
    return interaction.update(createMusicRadioCentralMessage(interaction.guild.id));
  }
};

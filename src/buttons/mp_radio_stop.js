const {
  createMusicRadioCentralMessage
} = require("../utils/panelHubMusic");

const {
  stopRadio
} = require("../utils/radioPlayer");

module.exports = {
  customId: "mp_radio_stop",

  async execute(interaction) {
    stopRadio(interaction.guild.id);
    return interaction.update(createMusicRadioCentralMessage(interaction.guild.id));
  }
};

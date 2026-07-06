const {
  createMusicNowCentralMessage
} = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_now",

  async execute(interaction) {
    return interaction.update(
      createMusicNowCentralMessage(interaction.guild.id)
    );
  }
};

const {
  createMusicHistoryCentralMessage
} = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_history",

  async execute(interaction) {
    return interaction.update(
      createMusicHistoryCentralMessage(interaction.guild.id)
    );
  }
};

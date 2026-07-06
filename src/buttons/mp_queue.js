const {
  createMusicQueueCentralMessage
} = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_queue",

  async execute(interaction) {
    return interaction.update(
      createMusicQueueCentralMessage(interaction.guild.id)
    );
  }
};

const {
  clearQueue
} = require("../utils/musicPlayer");

const {
  createMusicCentralMessage
} = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_clear",

  async execute(interaction) {
    await interaction.deferUpdate().catch(() => null);

    await clearQueue(interaction.guild.id).catch(() => null);

    return interaction.message.edit(
      createMusicCentralMessage(interaction.guild.id)
    ).catch(() => null);
  }
};

const {
  clearHistory
} = require("../utils/musicPlayer");

const {
  createMusicCentralMessage
} = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_clearhistory",

  async execute(interaction) {
    await interaction.deferUpdate().catch(() => null);

    await clearHistory(interaction.guild.id).catch(() => null);

    return interaction.message.edit(
      createMusicCentralMessage(interaction.guild.id)
    ).catch(() => null);
  }
};

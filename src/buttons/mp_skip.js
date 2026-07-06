const { skipTrack } = require("../utils/musicPlayer");
const { createMusicCentralMessage } = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_skip",

  async execute(interaction) {
    await interaction.deferUpdate().catch(() => null);

    skipTrack(interaction.guild.id);

    setTimeout(() => {
      interaction.message.edit(
        createMusicCentralMessage(interaction.guild.id)
      ).catch(() => null);
    }, 1000);
  }
};

const { pauseMusic } = require("../utils/musicPlayer");
const { createMusicCentralMessage } = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_pause",

  async execute(interaction) {
    await interaction.deferUpdate().catch(() => null);

    pauseMusic(interaction.guild.id);

    await interaction.message.edit(
      createMusicCentralMessage(interaction.guild.id)
    ).catch(() => null);
  }
};

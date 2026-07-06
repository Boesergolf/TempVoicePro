const { stopMusic } = require("../utils/musicPlayer");
const { createMusicCentralMessage } = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_stop",

  async execute(interaction) {
    await interaction.deferUpdate().catch(() => null);

    stopMusic(interaction.guild.id);

    await interaction.message.edit(
      createMusicCentralMessage(interaction.guild.id)
    ).catch(() => null);
  }
};

const {
  toggleLoop
} = require("../utils/musicPlayer");

const {
  createMusicCentralMessage
} = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_loop",

  async execute(interaction) {
    await interaction.deferUpdate().catch(() => null);

    await toggleLoop(interaction.guild.id).catch(() => null);

    return interaction.message.edit(
      createMusicCentralMessage(interaction.guild.id)
    ).catch(() => null);
  }
};

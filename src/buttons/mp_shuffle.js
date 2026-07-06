const {
  shuffleQueue
} = require("../utils/musicPlayer");

const {
  createMusicCentralMessage
} = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_shuffle",

  async execute(interaction) {
    await interaction.deferUpdate().catch(() => null);

    await shuffleQueue(interaction.guild.id).catch(() => null);

    return interaction.message.edit(
      createMusicCentralMessage(interaction.guild.id)
    ).catch(() => null);
  }
};

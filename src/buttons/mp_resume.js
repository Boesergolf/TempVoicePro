const { resumeMusic } = require("../utils/musicPlayer");
const { createMusicCentralMessage } = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_resume",

  async execute(interaction) {
    await interaction.deferUpdate().catch(() => null);

    resumeMusic(interaction.guild.id);

    await interaction.message.edit(
      createMusicCentralMessage(interaction.guild.id)
    ).catch(() => null);
  }
};

const {
  createMusicNowCentralMessage
} = require("../utils/panelHubMusic");

module.exports = {
  customId: "mp_now",

  async execute(interaction) {
    const payload = createMusicNowCentralMessage(interaction.guild.id);

    await interaction.deferUpdate();

    await interaction.message.suppressEmbeds(false).catch(() => null);

    return interaction.message.edit({
      content: payload.content || "",
      embeds: payload.embeds || [],
      components: payload.components || [],
      allowedMentions: {
        parse: []
      }
    });
  }
};

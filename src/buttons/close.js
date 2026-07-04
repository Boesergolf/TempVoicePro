const { hasAccess } = require("../utils/permissions");
const { deleteTempChannel } = require("../utils/tempChannels");

module.exports = {
  customId: "tv_close",

  async execute(interaction) {
    const channel = interaction.member?.voice?.channel;

    if (!channel) {
      return interaction.reply({
        content: "❌ Du bist in keinem Voice Channel.",
        ephemeral: true
      });
    }

    const allowed = await hasAccess(interaction.user.id, channel.id);

    if (!allowed) {
      return interaction.reply({
        content: "❌ Nur Owner oder Co-Owner dürfen diesen Channel schließen.",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: "🗑️ TempVoice Channel wird geschlossen...",
      ephemeral: true
    });

    await deleteTempChannel(channel);
  }
};

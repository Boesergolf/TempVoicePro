const { hasAccess } = require("../utils/permissions");
const { deleteTempChannel } = require("../utils/tempChannels");

module.exports = {
  customId: "tv_close",

  async execute(interaction) {
    const channel = interaction.member?.voice?.channel;

    if (!channel) {
      return interaction.reply({
        content: "❌ Du bist in keinem Voice Channel.",
        flags: 64
      });
    }

    const allowed = await hasAccess(interaction.user.id, channel.id);

    if (!allowed) {
      return interaction.reply({
        content: "❌ Nur Owner oder Co-Owner dürfen diesen Channel schließen.",
        flags: 64
      });
    }

    await interaction.reply({
      content: "🗑️ TempVoice Channel wird geschlossen...",
      flags: 64
    });

    await deleteTempChannel(channel);
  }
};

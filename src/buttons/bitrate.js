const { hasAccess } = require("../utils/permissions");

module.exports = {
  customId: "tv_bitrate",

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
        content: "❌ Nur Owner oder Co-Owner dürfen das nutzen.",
        ephemeral: true
      });
    }

    const current = channel.bitrate;
    const max = interaction.guild.maximumBitrate;

    const nextBitrate = current < max ? Math.min(current + 16000, max) : 64000;

    await channel.setBitrate(nextBitrate);

    return interaction.reply({
      content: `🎚 Bitrate gesetzt auf **${Math.round(nextBitrate / 1000)} kbps**.`,
      ephemeral: true
    });
  }
};

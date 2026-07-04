const { hasAccess } = require("../utils/permissions");

module.exports = {
  customId: "tv_hide",

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
        content: "❌ Nur Owner oder Co-Owner dürfen das nutzen.",
        flags: 64
      });
    }

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      ViewChannel: false
    });

    return interaction.reply({
      content: "👁 Channel versteckt.",
      flags: 64
    });
  }
};

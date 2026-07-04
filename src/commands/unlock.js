const { SlashCommandBuilder } = require("discord.js");
const { hasAccess } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Entsperrt deinen TempVoice Channel"),

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
      Connect: null
    });

    return interaction.reply({
      content: "🔓 Channel entsperrt.",
      flags: 64
    });
  }
};

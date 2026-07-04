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

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      Connect: null
    });

    return interaction.reply({
      content: "🔓 Channel entsperrt.",
      ephemeral: true
    });
  }
};

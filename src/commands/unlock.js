const { SlashCommandBuilder } = require("discord.js");
const { isOwnerOrCoOwner } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock your TempVoice channel"),

  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: "❌ Kein Channel", ephemeral: true });

    const allowed = await isOwnerOrCoOwner(interaction.user.id, channel.id);
    if (!allowed) return interaction.reply({ content: "❌ Kein Zugriff", ephemeral: true });

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      Connect: true
    });

    return interaction.reply({ content: "🔓 Channel geöffnet", ephemeral: true });
  }
};
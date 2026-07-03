const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { isOwnerOrCoOwner } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock your TempVoice channel"),

  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: "❌ Kein Channel", ephemeral: true });

    const allowed = await isOwnerOrCoOwner(interaction.user.id, channel.id);
    if (!allowed) return interaction.reply({ content: "❌ Kein Zugriff", ephemeral: true });

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      Connect: false
    });

    return interaction.reply({ content: "🔒 Channel gesperrt", ephemeral: true });
  }
};
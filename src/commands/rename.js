const {
  SlashCommandBuilder
} = require("discord.js");

const { isOwnerOrCoOwner } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rename")
    .setDescription("Rename your TempVoice channel")
    .addStringOption(opt =>
      opt.setName("name")
        .setDescription("New channel name")
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel) {
      return interaction.reply({ content: "❌ Du bist in keinem Voice Channel.", ephemeral: true });
    }

    const allowed = await isOwnerOrCoOwner(interaction.user.id, channel.id);
    if (!allowed) {
      return interaction.reply({ content: "❌ Kein Zugriff.", ephemeral: true });
    }

    const name = interaction.options.getString("name");

    await channel.setName(name);

    return interaction.reply({ content: `✅ Channel umbenannt zu **${name}**`, ephemeral: true });
  }
};
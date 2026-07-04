const { SlashCommandBuilder } = require("discord.js");
const { hasAccess } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rename")
    .setDescription("Benennt deinen TempVoice Channel um")
    .addStringOption(option =>
      option
        .setName("name")
        .setDescription("Neuer Channelname")
        .setRequired(true)
        .setMaxLength(100)
    ),

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

    const name = interaction.options.getString("name", true).trim();

    if (!name || name.length < 1 || name.length > 100) {
      return interaction.reply({
        content: "❌ Der Channelname muss zwischen 1 und 100 Zeichen lang sein.",
        ephemeral: true
      });
    }

    await channel.setName(name);

    return interaction.reply({
      content: `✏️ Channel umbenannt zu **${name}**.`,
      ephemeral: true
    });
  }
};

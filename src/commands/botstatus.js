const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const {
  createBotStatusEmbed
} = require("../utils/botStatusCheckView");

function hasBotStatusAccess(interaction) {
  return interaction.memberPermissions &&
    (
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
      interaction.memberPermissions.has(PermissionFlagsBits.Administrator)
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("botstatus")
    .setDescription("Professioneller Systemcheck für TempVoicePro")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: "❌ Dieser Command funktioniert nur auf Servern.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (!hasBotStatusAccess(interaction)) {
      return interaction.reply({
        content: "❌ Du brauchst **Server verwalten** oder **Administrator**.",
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    return interaction.editReply({
      embeds: [await createBotStatusEmbed(interaction)]
    });
  }
};

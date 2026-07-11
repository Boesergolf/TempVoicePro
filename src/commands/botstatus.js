const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  createBotStatusEmbed
} = require("../utils/botStatusCheckView");
const {
  deferEphemeral,
  replyEphemeral
} = require("../utils/interactionReplies");
const { statusLine } = require("../utils/ui");

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
      return replyEphemeral(interaction, statusLine("fail", "Dieser Command funktioniert nur auf Servern."));
    }

    if (!hasBotStatusAccess(interaction)) {
      return replyEphemeral(interaction, statusLine("fail", "Du brauchst **Server verwalten** oder **Administrator**."));
    }

    await deferEphemeral(interaction);

    return interaction.editReply({
      embeds: [await createBotStatusEmbed(interaction)]
    });
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  createSetupWizardMessage
} = require("../utils/setupWizardView");
const {
  deferEphemeral,
  replyEphemeral
} = require("../utils/interactionReplies");
const { statusLine } = require("../utils/ui");

function hasSetupWizardAccess(interaction) {
  return interaction.memberPermissions &&
    (
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
      interaction.memberPermissions.has(PermissionFlagsBits.Administrator)
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setupwizard")
    .setDescription("Geführter Admin-Setup-Assistent für TempVoicePro")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild) {
      return replyEphemeral(interaction, statusLine("fail", "Dieser Command funktioniert nur auf Servern."));
    }

    if (!hasSetupWizardAccess(interaction)) {
      return replyEphemeral(interaction, statusLine("fail", "Du brauchst **Server verwalten** oder **Administrator**."));
    }

    await deferEphemeral(interaction);

    return interaction.editReply(
      await createSetupWizardMessage(interaction.guild)
    );
  }
};

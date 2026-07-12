const {
  PermissionFlagsBits
} = require("discord.js");

const {
  createSetupWizardMessage
} = require("../utils/setupWizardView");
const {
  replyEphemeral
} = require("../utils/interactionReplies");

function hasAdminAccess(interaction) {
  return interaction.memberPermissions &&
    (
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
      interaction.memberPermissions.has(PermissionFlagsBits.Administrator)
    );
}

module.exports = {
  customId: "setupwizard_panelrebuild_cancel",

  async execute(interaction) {
    if (!hasAdminAccess(interaction)) {
      return replyEphemeral(
        interaction,
        "❌ Du brauchst **Server verwalten** oder **Administrator**."
      );
    }

    return interaction.update(
      await createSetupWizardMessage(interaction.guild)
    );
  }
};

const {
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const {
  createSetupWizardMessage
} = require("../utils/setupWizardView");

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
      return interaction.reply({
        content: "❌ Du brauchst **Server verwalten** oder **Administrator**.",
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.update(
      await createSetupWizardMessage(interaction.guild)
    );
  }
};

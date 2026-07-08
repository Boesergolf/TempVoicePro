const {
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const botstatus = require("../commands/botstatus");

function hasAdminAccess(interaction) {
  return interaction.memberPermissions &&
    (
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
      interaction.memberPermissions.has(PermissionFlagsBits.Administrator)
    );
}

module.exports = {
  customId: "setupwizard_botstatus",

  async execute(interaction, client) {
    if (!hasAdminAccess(interaction)) {
      return interaction.reply({
        content: "❌ Du brauchst **Server verwalten** oder **Administrator**.",
        flags: MessageFlags.Ephemeral
      });
    }

    return botstatus.execute(interaction, client);
  }
};

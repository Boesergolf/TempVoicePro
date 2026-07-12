const {
  PermissionFlagsBits
} = require("discord.js");

const {
  createBotStatusEmbed
} = require("../utils/botStatusCheckView");
const {
  deferEphemeral,
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
  customId: "setupwizard_botstatus",

  async execute(interaction) {
    if (!hasAdminAccess(interaction)) {
      return replyEphemeral(
        interaction,
        "❌ Du brauchst **Server verwalten** oder **Administrator**."
      );
    }

    await deferEphemeral(interaction);

    return interaction.editReply({
      embeds: [await createBotStatusEmbed(interaction)]
    });
  }
};

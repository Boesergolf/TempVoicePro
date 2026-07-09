const {
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const {
  createPanelRebuildConfirmMessage
} = require("../utils/setupWizardView");

const { PANEL_CHANNEL_NAME } = require("../utils/panelChannel");

function hasAdminAccess(interaction) {
  return interaction.memberPermissions &&
    (
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
      interaction.memberPermissions.has(PermissionFlagsBits.Administrator)
    );
}

module.exports = {
  customId: "setupwizard_panelrebuild",

  async execute(interaction) {
    if (!hasAdminAccess(interaction)) {
      return interaction.reply({
        content: "❌ Du brauchst **Server verwalten** oder **Administrator**.",
        flags: MessageFlags.Ephemeral
      });
    }

    const targetChannel = interaction.guild.channels.cache.find(channel =>
      channel &&
      channel.name === PANEL_CHANNEL_NAME &&
      channel.isTextBased &&
      channel.isTextBased()
    ) || interaction.channel;

    return interaction.reply({
      ...createPanelRebuildConfirmMessage(targetChannel.name),
      flags: MessageFlags.Ephemeral
    });
  }
};

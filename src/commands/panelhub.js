const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  createPanelHubMessage
} = require("../utils/panelHub");

const {
  replyWithCentralPanelView
} = require("../utils/panelHubController");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panelhub")
    .setDescription("Öffnet das zentrale TempVoicePro Kontrollzentrum.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    return replyWithCentralPanelView(
      interaction,
      createPanelHubMessage(),
      "Kontrollzentrum"
    );
  }
};

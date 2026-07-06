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
    .setName("panels")
    .setDescription("Öffnet das zentrale TempVoicePro Panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    return replyWithCentralPanelView(
      interaction,
      createPanelHubMessage(),
      "Kontrollzentrum"
    );
  }
};

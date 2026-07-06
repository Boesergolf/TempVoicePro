const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  createGluecksradHubMessage
} = require("../utils/panelHub");

const {
  replyWithCentralPanelView
} = require("../utils/panelHubController");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gluecksradpanel")
    .setDescription("Schaltet das Zentralpanel auf Glücksrad.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    return replyWithCentralPanelView(
      interaction,
      createGluecksradHubMessage(),
      "Glücksrad"
    );
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  createMusicHubMessage
} = require("../utils/panelHub");

const {
  replyWithCentralPanelView
} = require("../utils/panelHubController");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("musicpanel")
    .setDescription("Schaltet das Zentralpanel auf Musiksteuerung.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    return replyWithCentralPanelView(
      interaction,
      createMusicHubMessage(),
      "Musiksteuerung"
    );
  }
};

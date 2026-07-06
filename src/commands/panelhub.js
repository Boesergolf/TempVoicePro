const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  createPanelHubMessage
} = require("../utils/panelHub");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panelhub")
    .setDescription("Erstellt das zentrale TempVoicePro Kontrollzentrum.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.reply({
      content: "🧭 Kontrollzentrum wird erstellt...",
      flags: 64
    });

    await interaction.channel.send(createPanelHubMessage());

    await interaction.editReply({
      content: "✅ Kontrollzentrum wurde erstellt."
    });
  }
};

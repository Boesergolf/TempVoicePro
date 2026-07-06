const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  rebuildPanelChannel
} = require("../utils/panelRebuild");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panelrebuild")
    .setDescription("Räumt den Panel-Channel auf und baut die Hauptpanels neu auf.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addBooleanOption(option =>
      option
        .setName("confirm")
        .setDescription("Muss auf True gesetzt werden, damit wirklich aufgeräumt wird.")
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName("user_messages")
        .setDescription("Auch normale User-Nachrichten löschen. Standard: False")
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const confirm = interaction.options.getBoolean("confirm");
    const includeUserMessages = interaction.options.getBoolean("user_messages") || false;

    if (!confirm) {
      return interaction.reply({
        content:
          "❌ Abgebrochen.\n\n" +
          "Zum Ausführen nutze:\n" +
          "`/panelrebuild confirm:True`",
        flags: 64
      });
    }

    await interaction.reply({
      content: "🧹 Panel-Channel wird aufgeräumt und neu aufgebaut...",
      flags: 64
    });

    try {
      const result = await rebuildPanelChannel(
        interaction.channel,
        client || interaction.client,
        {
          includeUserMessages
        }
      );

      return interaction.editReply(
        "✅ Panel-Channel wurde neu aufgebaut.\n\n" +
        "Gelöschte Nachrichten: **" + result.cleanup.deleted + "**\n" +
        "Geprüfte Nachrichten: **" + result.cleanup.scanned + "**\n" +
        "Neue Panel-Nachrichten: **" + result.created + "**"
      );
    } catch (error) {
      console.error("❌ PanelRebuild Fehler:", error);

      return interaction.editReply(
        "❌ Panel-Rebuild fehlgeschlagen. Details stehen im Bot-Log."
      );
    }
  }
};

const {
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

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

    return interaction.reply({
      content:
        "🧭 **Zentralpanel rebuild**\n\n" +
        "Dieser Button löscht nichts automatisch.\n\n" +
        "Für einen bewussten Neuaufbau nutze den bestehenden Command:\n" +
        "`/panelrebuild confirm:True`\n\n" +
        "Der Command räumt den aktuellen Panel-Channel auf und baut das Zentralpanel neu auf.",
      flags: MessageFlags.Ephemeral
    });
  }
};

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
  customId: "setupwizard_tempvoice",

  async execute(interaction) {
    if (!hasAdminAccess(interaction)) {
      return interaction.reply({
        content: "❌ Du brauchst **Server verwalten** oder **Administrator**.",
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply({
      content:
        "🎙️ **TempVoice Setup**\n\n" +
        "Der Assistent baut TempVoice nicht ungefragt um.\n\n" +
        "Nutze zum Einrichten oder Aktualisieren den bestehenden Command:\n" +
        "`/setup`\n\n" +
        "Danach kannst du hier mit **Setup aktualisieren** erneut prüfen.",
      flags: MessageFlags.Ephemeral
    });
  }
};

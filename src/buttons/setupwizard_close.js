const {
  EmbedBuilder,
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
  customId: "setupwizard_close",

  async execute(interaction) {
    if (!hasAdminAccess(interaction)) {
      return interaction.reply({
        content: "❌ Du brauchst **Server verwalten** oder **Administrator**.",
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("TempVoicePro Setup-Assistent")
      .setColor(0x5865f2)
      .setDescription("Setup-Assistent geschlossen.")
      .setTimestamp();

    return interaction.update({
      embeds: [embed],
      components: []
    });
  }
};

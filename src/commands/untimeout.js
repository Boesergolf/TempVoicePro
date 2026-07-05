const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const {
  sendModLog
} = require("../utils/modLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Entfernt den Timeout eines Mitglieds")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Bei welchem User soll der Timeout entfernt werden?")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("grund")
        .setDescription("Grund für das Entfernen des Timeouts")
        .setRequired(false)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("grund") || "Kein Grund angegeben";

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.editReply("❌ Mitglied wurde auf diesem Server nicht gefunden.");
    }

    if (!member.moderatable) {
      return interaction.editReply("❌ Dieses Mitglied kann ich nicht bearbeiten. Prüfe Rollen-Hierarchie und Bot-Rechte.");
    }

    await member.timeout(
      null,
      reason + " | Moderator: " + interaction.user.tag
    );

    await sendModLog(interaction.guild, {
      title: "✅ Timeout entfernt",
      color: 0x2ecc71,
      description: "Timeout wurde entfernt.",
      fields: [
        {
          name: "User",
          value: user.toString(),
          inline: true
        },
        {
          name: "Moderator",
          value: interaction.user.toString(),
          inline: true
        },
        {
          name: "Grund",
          value: reason
        }
      ]
    });

    return interaction.editReply(
      "✅ Timeout von " + user.toString() + " wurde entfernt."
    );
  }
};

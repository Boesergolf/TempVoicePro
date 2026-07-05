const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const {
  sendModLog
} = require("../utils/modLog");

function daysToSeconds(days) {
  return Math.max(0, Math.min(7, Number(days || 0))) * 24 * 60 * 60;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannt einen User vom Server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Welcher User soll gebannt werden?")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("grund")
        .setDescription("Grund für den Ban")
        .setRequired(false)
        .setMaxLength(500)
    )
    .addIntegerOption(option =>
      option
        .setName("nachrichten_tage")
        .setDescription("Nachrichten der letzten X Tage löschen, 0 bis 7")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("grund") || "Kein Grund angegeben";
    const deleteDays = interaction.options.getInteger("nachrichten_tage") || 0;

    if (user.id === interaction.user.id) {
      return interaction.editReply("❌ Du kannst dich nicht selbst bannen.");
    }

    if (user.id === interaction.client.user.id) {
      return interaction.editReply("❌ Ich kann mich nicht selbst bannen.");
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member && !member.bannable) {
      return interaction.editReply(
        "❌ Dieses Mitglied kann ich nicht bannen. Prüfe Rollen-Hierarchie und Bot-Rechte."
      );
    }

    await interaction.guild.members.ban(user.id, {
      deleteMessageSeconds: daysToSeconds(deleteDays),
      reason: reason + " | Moderator: " + interaction.user.tag
    });

    await sendModLog(interaction.guild, {
      title: "🔨 User gebannt",
      color: 0xe74c3c,
      description: user.toString() + " wurde vom Server gebannt.",
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
          name: "Nachrichten gelöscht",
          value: String(deleteDays) + " Tag(e)",
          inline: true
        },
        {
          name: "Grund",
          value: reason
        }
      ]
    });

    return interaction.editReply(
      "🔨 " + user.toString() + " wurde gebannt."
    );
  }
};

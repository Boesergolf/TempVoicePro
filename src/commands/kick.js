const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const {
  sendModLog
} = require("../utils/modLog");

const {
  createModerationCase
} = require("../utils/moderationCases");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kickt ein Mitglied vom Server")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Welcher User soll gekickt werden?")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("grund")
        .setDescription("Grund für den Kick")
        .setRequired(false)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("grund") || "Kein Grund angegeben";

    if (user.id === interaction.user.id) {
      return interaction.editReply("❌ Du kannst dich nicht selbst kicken.");
    }

    if (user.id === interaction.client.user.id) {
      return interaction.editReply("❌ Ich kann mich nicht selbst kicken.");
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.editReply("❌ Dieses Mitglied wurde auf dem Server nicht gefunden.");
    }

    if (!member.kickable) {
      return interaction.editReply("❌ Dieses Mitglied kann ich nicht kicken. Prüfe Rollen-Hierarchie und Bot-Rechte.");
    }

    await member.kick(reason + " | Moderator: " + interaction.user.tag);

    const modCase = await createModerationCase({
      guildId: interaction.guild.id,
      actionType: "kick",
      targetId: user.id,
      moderatorId: interaction.user.id,
      reason
    });

    await sendModLog(interaction.guild, {
      title: "👢 User gekickt",
      color: 0xe67e22,
      description: user.toString() + " wurde vom Server gekickt.",
      fields: [
        {
          name: "Case",
          value: "#" + modCase.id,
          inline: true
        },
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
      "👢 " + user.toString() + " wurde gekickt.\n" +
      "📌 Case: **#" + modCase.id + "**"
    );
  }
};

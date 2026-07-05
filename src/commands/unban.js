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
    .setName("unban")
    .setDescription("Entbannt einen User vom Server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option
        .setName("userid")
        .setDescription("Discord User-ID des gebannten Users")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("grund")
        .setDescription("Grund für den Unban")
        .setRequired(false)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const userId = interaction.options.getString("userid").trim();
    const reason = interaction.options.getString("grund") || "Kein Grund angegeben";

    if (!/^\d{15,25}$/.test(userId)) {
      return interaction.editReply(
        "❌ Bitte gib eine gültige Discord User-ID ein."
      );
    }

    const banInfo = await interaction.guild.bans.fetch(userId).catch(() => null);

    if (!banInfo) {
      return interaction.editReply(
        "❌ Für diese User-ID wurde kein Ban auf diesem Server gefunden."
      );
    }

    await interaction.guild.members.unban(
      userId,
      reason + " | Moderator: " + interaction.user.tag
    );

    await sendModLog(interaction.guild, {
      title: "✅ User entbannt",
      color: 0x2ecc71,
      description: "<@" + userId + "> wurde entbannt.",
      fields: [
        {
          name: "User-ID",
          value: "`" + userId + "`",
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
      "✅ User mit ID `" + userId + "` wurde entbannt."
    );
  }
};

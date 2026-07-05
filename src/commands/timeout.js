const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const {
  sendModLog
} = require("../utils/modLog");

function minutesToMs(minutes) {
  return minutes * 60 * 1000;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Setzt ein Mitglied in Timeout")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Welcher User soll in Timeout?")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("minuten")
        .setDescription("Timeout-Dauer in Minuten")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption(option =>
      option
        .setName("grund")
        .setDescription("Grund für den Timeout")
        .setRequired(false)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const user = interaction.options.getUser("user");
    const minutes = interaction.options.getInteger("minuten");
    const reason = interaction.options.getString("grund") || "Kein Grund angegeben";

    if (user.id === interaction.user.id) {
      return interaction.editReply("❌ Du kannst dich nicht selbst timeouten.");
    }

    if (user.bot) {
      return interaction.editReply("❌ Bots können nicht getimeoutet werden.");
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.editReply("❌ Mitglied wurde auf diesem Server nicht gefunden.");
    }

    if (!member.moderatable) {
      return interaction.editReply("❌ Dieses Mitglied kann ich nicht timeouten. Prüfe Rollen-Hierarchie und Bot-Rechte.");
    }

    await member.timeout(
      minutesToMs(minutes),
      reason + " | Moderator: " + interaction.user.tag
    );

    await sendModLog(interaction.guild, {
      title: "⏳ Timeout gesetzt",
      color: 0xe67e22,
      description: user.toString() + " wurde in Timeout gesetzt.",
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
          name: "Dauer",
          value: String(minutes) + " Minuten",
          inline: true
        },
        {
          name: "Grund",
          value: reason
        }
      ]
    });

    return interaction.editReply(
      "⏳ " + user.toString() + " wurde für **" + minutes + " Minuten** in Timeout gesetzt."
    );
  }
};

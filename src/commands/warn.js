const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const {
  addWarning,
  getActiveWarningCount
} = require("../utils/warnings");

const {
  sendModLog
} = require("../utils/modLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Verwarnt ein Mitglied")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Welcher User soll verwarnt werden?")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("grund")
        .setDescription("Grund für die Verwarnung")
        .setRequired(true)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("grund");

    if (user.id === interaction.user.id) {
      return interaction.editReply("❌ Du kannst dich nicht selbst verwarnen.");
    }

    if (user.bot) {
      return interaction.editReply("❌ Bots können nicht verwarnt werden.");
    }

    const warning = await addWarning(
      interaction.guild.id,
      user.id,
      interaction.user.id,
      reason
    );

    const activeCount = await getActiveWarningCount(
      interaction.guild.id,
      user.id
    );

    await sendModLog(interaction.guild, {
      title: "⚠️ User verwarnt",
      color: 0xf1c40f,
      description: user.toString() + " wurde verwarnt.",
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
          name: "Warn-ID",
          value: String(warning.id),
          inline: true
        },
        {
          name: "Aktive Warns",
          value: String(activeCount),
          inline: true
        },
        {
          name: "Grund",
          value: reason
        }
      ]
    });

    return interaction.editReply(
      "✅ " + user.toString() + " wurde verwarnt.\n" +
      "⚠️ Aktive Warns: **" + activeCount + "**"
    );
  }
};

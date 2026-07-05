const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const {
  clearWarnings
} = require("../utils/warnings");

const {
  sendModLog
} = require("../utils/modLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Löscht aktive Verwarnungen eines Users")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Bei welchem User sollen Warns gelöscht werden?")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("grund")
        .setDescription("Grund für das Löschen der Warns")
        .setRequired(false)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("grund") || "Kein Grund angegeben";

    const cleared = await clearWarnings(interaction.guild.id, user.id);

    await sendModLog(interaction.guild, {
      title: "🧹 Warns gelöscht",
      color: 0x3498db,
      description: "Aktive Verwarnungen wurden gelöscht.",
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
          name: "Gelöschte Warns",
          value: String(cleared),
          inline: true
        },
        {
          name: "Grund",
          value: reason
        }
      ]
    });

    return interaction.editReply(
      "🧹 Aktive Warns von " + user.toString() + " gelöscht: **" + cleared + "**"
    );
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const {
  getWarnings,
  getActiveWarningCount
} = require("../utils/warnings");

function formatDate(value) {
  const date = new Date(value);
  const timestamp = Math.floor(date.getTime() / 1000);

  if (Number.isNaN(timestamp)) {
    return "Unbekannt";
  }

  return "<t:" + timestamp + ":f>";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Zeigt Verwarnungen eines Users")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Welcher User soll geprüft werden?")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const user = interaction.options.getUser("user");
    const warnings = await getWarnings(interaction.guild.id, user.id);
    const activeCount = await getActiveWarningCount(interaction.guild.id, user.id);

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Verwarnungen")
      .setColor(activeCount > 0 ? 0xf1c40f : 0x2ecc71)
      .setDescription("Warn-Übersicht für " + user.toString())
      .addFields({
        name: "Aktive Warns",
        value: String(activeCount),
        inline: true
      })
      .setTimestamp();

    if (warnings.length === 0) {
      embed.addFields({
        name: "Einträge",
        value: "Keine Verwarnungen gefunden."
      });
    } else {
      embed.addFields({
        name: "Letzte Verwarnungen",
        value: warnings.map(warn => {
          const status = warn.active ? "✅ aktiv" : "🧹 gelöscht";

          return "**#" + warn.id + "** — " + status + "\n" +
            "Moderator: <@" + warn.moderatorId + ">\n" +
            "Datum: " + formatDate(warn.createdAt) + "\n" +
            "Grund: " + warn.reason;
        }).join("\n\n").slice(0, 4000)
      });
    }

    return interaction.editReply({
      embeds: [embed]
    });
  }
};

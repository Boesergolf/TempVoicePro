const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const {
  getActiveWarningCount
} = require("../utils/warnings");

const {
  getUserCases,
  getUserCaseStats
} = require("../utils/moderationCases");

function formatDate(value) {
  const date = new Date(value);
  const timestamp = Math.floor(date.getTime() / 1000);

  if (Number.isNaN(timestamp)) {
    return "Unbekannt";
  }

  return "<t:" + timestamp + ":R>";
}

function actionLabel(actionType) {
  const labels = {
    warn: "⚠️ Warn",
    clearwarnings: "🧹 Warns gelöscht",
    timeout: "⏳ Timeout",
    untimeout: "✅ Timeout entfernt",
    kick: "👢 Kick",
    ban: "🔨 Ban",
    unban: "✅ Unban",
    automod: "🤖 Auto-Mod"
  };

  return labels[actionType] || actionType;
}

function getCount(stats, actionType) {
  return stats.byAction[actionType] || 0;
}

function formatRecentCases(cases) {
  if (!cases || cases.length === 0) {
    return "Keine Cases gefunden.";
  }

  return cases.map(modCase => {
    return "**#" + modCase.id + "** " +
      actionLabel(modCase.actionType) +
      " — " + formatDate(modCase.createdAt) +
      "\nGrund: " + modCase.reason;
  }).join("\n\n").slice(0, 1000);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moduser")
    .setDescription("Zeigt das Moderationsprofil eines Users")
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

    const activeWarnings = await getActiveWarningCount(
      interaction.guild.id,
      user.id
    );

    const stats = await getUserCaseStats(
      interaction.guild.id,
      user.id
    );

    const recentCases = await getUserCases(
      interaction.guild.id,
      user.id,
      5
    );

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Moderationsprofil")
      .setColor(0x5865f2)
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .addFields(
        {
          name: "User",
          value: user.toString(),
          inline: true
        },
        {
          name: "User-ID",
          value: "`" + user.id + "`",
          inline: true
        },
        {
          name: "Aktive Warns",
          value: String(activeWarnings),
          inline: true
        },
        {
          name: "Cases gesamt",
          value: String(stats.total),
          inline: true
        },
        {
          name: "Warns",
          value: String(getCount(stats, "warn")),
          inline: true
        },
        {
          name: "Timeouts",
          value: String(getCount(stats, "timeout")),
          inline: true
        },
        {
          name: "Kicks",
          value: String(getCount(stats, "kick")),
          inline: true
        },
        {
          name: "Bans",
          value: String(getCount(stats, "ban")),
          inline: true
        },
        {
          name: "Unbans",
          value: String(getCount(stats, "unban")),
          inline: true
        },
        {
          name: "Auto-Mod",
          value: String(getCount(stats, "automod")),
          inline: true
        },
        {
          name: "Letzte Cases",
          value: formatRecentCases(recentCases)
        }
      )
      .setFooter({
        text: "TempVoicePro Moderation"
      })
      .setTimestamp();

    return interaction.editReply({
      embeds: [embed]
    });
  }
};

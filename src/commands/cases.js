const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const {
  getModerationCase,
  getRecentCases,
  getUserCases,
  updateModerationCaseReason
} = require("../utils/moderationCases");

const {
  sendModLog
} = require("../utils/modLog");

function formatDate(value) {
  const date = new Date(value);
  const timestamp = Math.floor(date.getTime() / 1000);

  if (Number.isNaN(timestamp)) {
    return "Unbekannt";
  }

  return "<t:" + timestamp + ":f>";
}

function actionLabel(actionType) {
  const labels = {
    warn: "⚠️ Warn",
    clearwarnings: "🧹 Warns gelöscht",
    timeout: "⏳ Timeout",
    untimeout: "✅ Timeout entfernt",
    kick: "👢 Kick",
    ban: "🔨 Ban",
    unban: "✅ Unban"
  };

  return labels[actionType] || actionType;
}

function formatCaseLine(modCase) {
  return "**#" + modCase.id + "** — " + actionLabel(modCase.actionType) + "\n" +
    "User: <@" + modCase.targetId + ">\n" +
    "Moderator: <@" + modCase.moderatorId + ">\n" +
    "Datum: " + formatDate(modCase.createdAt) + "\n" +
    "Grund: " + modCase.reason;
}

function createCaseEmbed(modCase) {
  return new EmbedBuilder()
    .setTitle("📌 Moderation Case #" + modCase.id)
    .setColor(0x5865f2)
    .addFields(
      {
        name: "Aktion",
        value: actionLabel(modCase.actionType),
        inline: true
      },
      {
        name: "User",
        value: "<@" + modCase.targetId + ">",
        inline: true
      },
      {
        name: "Moderator",
        value: "<@" + modCase.moderatorId + ">",
        inline: true
      },
      {
        name: "Datum",
        value: formatDate(modCase.createdAt),
        inline: true
      },
      {
        name: "Grund",
        value: modCase.reason
      }
    )
    .setFooter({
      text: "TempVoicePro Moderation Cases"
    })
    .setTimestamp();
}

function createCasesListEmbed(title, cases) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x5865f2)
    .setFooter({
      text: "TempVoicePro Moderation Cases"
    })
    .setTimestamp();

  if (!cases || cases.length === 0) {
    embed.setDescription("Keine Cases gefunden.");
    return embed;
  }

  embed.setDescription(
    cases.map(formatCaseLine).join("\n\n").slice(0, 4000)
  );

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cases")
    .setDescription("Zeigt Moderation Cases an")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub
        .setName("recent")
        .setDescription("Zeigt die letzten Moderation Cases")
        .addIntegerOption(option =>
          option
            .setName("limit")
            .setDescription("Anzahl der Cases, 1 bis 25")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("user")
        .setDescription("Zeigt Cases eines Users")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("Welcher User soll geprüft werden?")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("limit")
            .setDescription("Anzahl der Cases, 1 bis 25")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("reason")
        .setDescription("Ändert den Grund eines Moderation Cases")
        .addIntegerOption(option =>
          option
            .setName("id")
            .setDescription("Case-ID")
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option
            .setName("grund")
            .setDescription("Neuer Grund")
            .setRequired(true)
            .setMaxLength(1000)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("show")
        .setDescription("Zeigt einen bestimmten Case")
        .addIntegerOption(option =>
          option
            .setName("id")
            .setDescription("Case-ID")
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "recent") {
      const limit = interaction.options.getInteger("limit") || 10;
      const cases = await getRecentCases(interaction.guild.id, limit);

      return interaction.editReply({
        embeds: [createCasesListEmbed("📋 Letzte Moderation Cases", cases)]
      });
    }

    if (subcommand === "user") {
      const user = interaction.options.getUser("user");
      const limit = interaction.options.getInteger("limit") || 10;
      const cases = await getUserCases(interaction.guild.id, user.id, limit);

      return interaction.editReply({
        embeds: [createCasesListEmbed("📋 Cases für " + user.tag, cases)]
      });
    }

    if (subcommand === "reason") {
      const caseId = interaction.options.getInteger("id");
      const newReason = interaction.options.getString("grund");

      const oldCase = await getModerationCase(interaction.guild.id, caseId);

      if (!oldCase) {
        return interaction.editReply("❌ Case #" + caseId + " wurde nicht gefunden.");
      }

      const updatedCase = await updateModerationCaseReason(
        interaction.guild.id,
        caseId,
        newReason
      );

      await sendModLog(interaction.guild, {
        title: "📝 Case-Grund geändert",
        color: 0x5865f2,
        description: "Case #" + caseId + " wurde aktualisiert.",
        fields: [
          {
            name: "Case",
            value: "#" + caseId,
            inline: true
          },
          {
            name: "Bearbeitet von",
            value: interaction.user.toString(),
            inline: true
          },
          {
            name: "Alter Grund",
            value: oldCase.reason.slice(0, 1000)
          },
          {
            name: "Neuer Grund",
            value: updatedCase.reason.slice(0, 1000)
          }
        ]
      });

      return interaction.editReply({
        content: "📝 Case #" + caseId + " wurde aktualisiert.",
        embeds: [createCaseEmbed(updatedCase)]
      });
    }

    const caseId = interaction.options.getInteger("id");
    const modCase = await getModerationCase(interaction.guild.id, caseId);

    if (!modCase) {
      return interaction.editReply("❌ Case #" + caseId + " wurde nicht gefunden.");
    }

    return interaction.editReply({
      embeds: [createCaseEmbed(modCase)]
    });
  }
};

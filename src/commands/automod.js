const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const {
  getAutoModSettings,
  updateAutoModSettings
} = require("../utils/autoModSettings");

function enabledText(value) {
  return value ? "✅ Aktiv" : "❌ Inaktiv";
}

function createSettingsEmbed(settings) {
  return new EmbedBuilder()
    .setTitle("🤖 Auto-Mod Einstellungen")
    .setColor(settings.enabled ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      {
        name: "Auto-Mod",
        value: enabledText(settings.enabled),
        inline: true
      },
      {
        name: "Anti-Spam",
        value:
          enabledText(settings.antiSpamEnabled) +
          "\nLimit: `" + settings.spamMessageLimit + "` Nachrichten" +
          "\nZeitfenster: `" + settings.spamIntervalSeconds + "` Sekunden",
        inline: true
      },
      {
        name: "Anti-Link",
        value: enabledText(settings.antiLinkEnabled),
        inline: true
      },
      {
        name: "Anti-Caps",
        value:
          enabledText(settings.antiCapsEnabled) +
          "\nMinimum: `" + settings.capsMinLength + "` Zeichen" +
          "\nGrenze: `" + settings.capsPercent + "%`",
        inline: true
      },
      {
        name: "Auto-Warn",
        value: enabledText(settings.autoWarnEnabled),
        inline: true
      },
      {
        name: "Auto-Timeout",
        value:
          enabledText(settings.timeoutEnabled) +
          "\nDauer: `" + settings.timeoutMinutes + "` Minuten",
        inline: true
      }
    )
    .setFooter({
      text: "TempVoicePro Auto-Mod"
    })
    .setTimestamp();
}

async function replyWithSettings(interaction, content, settings) {
  return interaction.editReply({
    content,
    embeds: [createSettingsEmbed(settings)]
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Verwaltet das Auto-Mod-System")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName("status")
        .setDescription("Zeigt die aktuellen Auto-Mod Einstellungen")
    )
    .addSubcommand(sub =>
      sub
        .setName("enable")
        .setDescription("Aktiviert Auto-Mod")
    )
    .addSubcommand(sub =>
      sub
        .setName("disable")
        .setDescription("Deaktiviert Auto-Mod")
    )
    .addSubcommand(sub =>
      sub
        .setName("antispam")
        .setDescription("Konfiguriert Anti-Spam")
        .addBooleanOption(option =>
          option
            .setName("aktiv")
            .setDescription("Anti-Spam aktivieren oder deaktivieren")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("limit")
            .setDescription("Nachrichtenlimit, 2 bis 20")
            .setRequired(false)
            .setMinValue(2)
            .setMaxValue(20)
        )
        .addIntegerOption(option =>
          option
            .setName("sekunden")
            .setDescription("Zeitfenster in Sekunden, 3 bis 60")
            .setRequired(false)
            .setMinValue(3)
            .setMaxValue(60)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("antilink")
        .setDescription("Konfiguriert Anti-Link")
        .addBooleanOption(option =>
          option
            .setName("aktiv")
            .setDescription("Anti-Link aktivieren oder deaktivieren")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("anticaps")
        .setDescription("Konfiguriert Anti-Caps")
        .addBooleanOption(option =>
          option
            .setName("aktiv")
            .setDescription("Anti-Caps aktivieren oder deaktivieren")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("prozent")
            .setDescription("Großbuchstaben-Grenze in Prozent, 50 bis 100")
            .setRequired(false)
            .setMinValue(50)
            .setMaxValue(100)
        )
        .addIntegerOption(option =>
          option
            .setName("min_zeichen")
            .setDescription("Mindestlänge der Nachricht, 5 bis 200")
            .setRequired(false)
            .setMinValue(5)
            .setMaxValue(200)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("autowarn")
        .setDescription("Konfiguriert automatische Warns")
        .addBooleanOption(option =>
          option
            .setName("aktiv")
            .setDescription("Auto-Warn aktivieren oder deaktivieren")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("timeout")
        .setDescription("Konfiguriert automatische Timeouts")
        .addBooleanOption(option =>
          option
            .setName("aktiv")
            .setDescription("Auto-Timeout aktivieren oder deaktivieren")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("minuten")
            .setDescription("Timeout-Dauer in Minuten, 1 bis 40320")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(40320)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "status") {
      const settings = await getAutoModSettings(interaction.guild.id);

      return replyWithSettings(
        interaction,
        "🤖 Aktuelle Auto-Mod Einstellungen:",
        settings
      );
    }

    if (subcommand === "enable") {
      const settings = await updateAutoModSettings(interaction.guild.id, {
        enabled: true
      });

      return replyWithSettings(
        interaction,
        "✅ Auto-Mod wurde aktiviert.",
        settings
      );
    }

    if (subcommand === "disable") {
      const settings = await updateAutoModSettings(interaction.guild.id, {
        enabled: false
      });

      return replyWithSettings(
        interaction,
        "❌ Auto-Mod wurde deaktiviert.",
        settings
      );
    }

    if (subcommand === "antispam") {
      const changes = {
        antiSpamEnabled: interaction.options.getBoolean("aktiv")
      };

      const limit = interaction.options.getInteger("limit");
      const seconds = interaction.options.getInteger("sekunden");

      if (limit !== null) {
        changes.spamMessageLimit = limit;
      }

      if (seconds !== null) {
        changes.spamIntervalSeconds = seconds;
      }

      const settings = await updateAutoModSettings(interaction.guild.id, changes);

      return replyWithSettings(
        interaction,
        "✅ Anti-Spam wurde aktualisiert.",
        settings
      );
    }

    if (subcommand === "antilink") {
      const settings = await updateAutoModSettings(interaction.guild.id, {
        antiLinkEnabled: interaction.options.getBoolean("aktiv")
      });

      return replyWithSettings(
        interaction,
        "✅ Anti-Link wurde aktualisiert.",
        settings
      );
    }

    if (subcommand === "anticaps") {
      const changes = {
        antiCapsEnabled: interaction.options.getBoolean("aktiv")
      };

      const percent = interaction.options.getInteger("prozent");
      const minLength = interaction.options.getInteger("min_zeichen");

      if (percent !== null) {
        changes.capsPercent = percent;
      }

      if (minLength !== null) {
        changes.capsMinLength = minLength;
      }

      const settings = await updateAutoModSettings(interaction.guild.id, changes);

      return replyWithSettings(
        interaction,
        "✅ Anti-Caps wurde aktualisiert.",
        settings
      );
    }

    if (subcommand === "autowarn") {
      const settings = await updateAutoModSettings(interaction.guild.id, {
        autoWarnEnabled: interaction.options.getBoolean("aktiv")
      });

      return replyWithSettings(
        interaction,
        "✅ Auto-Warn wurde aktualisiert.",
        settings
      );
    }

    if (subcommand === "timeout") {
      const changes = {
        timeoutEnabled: interaction.options.getBoolean("aktiv")
      };

      const minutes = interaction.options.getInteger("minuten");

      if (minutes !== null) {
        changes.timeoutMinutes = minutes;
      }

      const settings = await updateAutoModSettings(interaction.guild.id, changes);

      return replyWithSettings(
        interaction,
        "✅ Auto-Timeout wurde aktualisiert.",
        settings
      );
    }

    return interaction.editReply("❌ Unbekannter Auto-Mod Befehl.");
  }
};

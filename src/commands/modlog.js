const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const {
  getModLogSettings,
  setModLogChannel,
  disableModLog,
  sendModLog
} = require("../utils/modLog");

function createStatusEmbed(settings, guild) {
  const channel = settings.modLogChannelId
    ? guild.channels.cache.get(settings.modLogChannelId)
    : null;

  return new EmbedBuilder()
    .setTitle("🛡 Modlog Status")
    .setColor(settings.enabled ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      {
        name: "Status",
        value: settings.enabled ? "✅ Aktiv" : "❌ Deaktiviert",
        inline: true
      },
      {
        name: "Channel",
        value: channel ? channel.toString() : "Nicht gesetzt",
        inline: true
      }
    )
    .setFooter({
      text: "TempVoicePro Moderation"
    })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modlog")
    .setDescription("Verwaltet den Moderation Log Channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Richtet den Modlog Channel ein")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Channel für Moderation Logs")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("status")
        .setDescription("Zeigt den aktuellen Modlog Status")
    )
    .addSubcommand(sub =>
      sub
        .setName("disable")
        .setDescription("Deaktiviert den Modlog")
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "setup") {
      const channel = interaction.options.getChannel("channel");

      await setModLogChannel(interaction.guild.id, channel.id);

      await sendModLog(interaction.guild, {
        title: "🛡 Modlog eingerichtet",
        color: 0x2ecc71,
        description: "Der Moderation Log wurde aktiviert.",
        fields: [
          {
            name: "Channel",
            value: channel.toString(),
            inline: true
          },
          {
            name: "Eingerichtet von",
            value: interaction.user.toString(),
            inline: true
          }
        ]
      });

      return interaction.editReply(
        "✅ Modlog wurde eingerichtet in " + channel.toString()
      );
    }

    if (subcommand === "disable") {
      await disableModLog(interaction.guild.id);

      return interaction.editReply(
        "❌ Modlog wurde deaktiviert."
      );
    }

    const settings = await getModLogSettings(interaction.guild.id);

    return interaction.editReply({
      embeds: [createStatusEmbed(settings, interaction.guild)]
    });
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const {
  PANEL_CHANNEL_NAME,
  getPanelMessageDeleteMs
} = require("../utils/panelChannel");

function yesNo(value) {
  return value ? "✅ Ja" : "❌ Nein";
}

function getAutoRefreshMs() {
  const value = Number(process.env.PANEL_AUTO_REFRESH_MS || 30000);

  if (Number.isNaN(value) || value < 10000) {
    return 30000;
  }

  return value;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panelcheck")
    .setDescription("Prüft den zentralen Panel-Channel und Bot-Berechtigungen")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const channel = interaction.guild.channels.cache.find(item =>
      item &&
      item.type === ChannelType.GuildText &&
      item.name === PANEL_CHANNEL_NAME
    );

    if (!channel) {
      return interaction.editReply(
        "❌ Der zentrale Panel-Channel `#" + PANEL_CHANNEL_NAME + "` wurde nicht gefunden.\n\n" +
        "Erstelle ihn mit:\n" +
        "`/panels kategorie:DEINE_KATEGORIE`"
      );
    }

    const botMember = await interaction.guild.members.fetchMe();
    const perms = channel.permissionsFor(botMember);

    const canView = perms.has(PermissionFlagsBits.ViewChannel);
    const canSend = perms.has(PermissionFlagsBits.SendMessages);
    const canEmbed = perms.has(PermissionFlagsBits.EmbedLinks);
    const canReadHistory = perms.has(PermissionFlagsBits.ReadMessageHistory);
    const canManageMessages = perms.has(PermissionFlagsBits.ManageMessages);
    const canManageChannels = perms.has(PermissionFlagsBits.ManageChannels);

    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);

    let panelCount = 0;

    if (messages) {
      panelCount = messages.filter(message =>
        message.author &&
        message.author.id === interaction.client.user.id &&
        message.embeds &&
        message.embeds.length > 0
      ).size;
    }

    const deleteSeconds = Math.round(getPanelMessageDeleteMs() / 1000);
    const refreshSeconds = Math.round(getAutoRefreshMs() / 1000);

    const embed = new EmbedBuilder()
      .setTitle("🧪 Panel Check")
      .setColor(0x5865f2)
      .setDescription("Diagnose für den zentralen Panel-Channel " + channel.toString())
      .addFields(
        {
          name: "Channel",
          value: channel.toString(),
          inline: true
        },
        {
          name: "Kategorie",
          value: channel.parent ? channel.parent.name : "Keine Kategorie",
          inline: true
        },
        {
          name: "Gefundene Panel-Nachrichten",
          value: String(panelCount),
          inline: true
        },
        {
          name: "Timer",
          value:
            "Auto-Löschen: **" + deleteSeconds + "s**\n" +
            "Auto-Refresh: **" + refreshSeconds + "s**"
        },
        {
          name: "Bot-Rechte",
          value:
            "Channel sehen: " + yesNo(canView) + "\n" +
            "Nachrichten senden: " + yesNo(canSend) + "\n" +
            "Embeds senden: " + yesNo(canEmbed) + "\n" +
            "Verlauf lesen: " + yesNo(canReadHistory) + "\n" +
            "Nachrichten verwalten: " + yesNo(canManageMessages) + "\n" +
            "Channel verwalten: " + yesNo(canManageChannels)
        }
      )
      .setFooter({
        text: "TempVoicePro Panel Diagnose"
      })
      .setTimestamp();

    return interaction.editReply({
      embeds: [embed]
    });
  }
};

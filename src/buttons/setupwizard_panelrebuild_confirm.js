const {
  ChannelType,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const { PANEL_CHANNEL_NAME } = require("../utils/panelChannel");
const { rebuildPanelChannel } = require("../utils/panelRebuild");

function hasAdminAccess(interaction) {
  return interaction.memberPermissions &&
    (
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
      interaction.memberPermissions.has(PermissionFlagsBits.Administrator)
    );
}

function findRebuildTargetChannel(interaction) {
  const configuredChannel = interaction.guild.channels.cache.find(channel =>
    channel &&
    channel.type === ChannelType.GuildText &&
    channel.name === PANEL_CHANNEL_NAME
  );

  if (configuredChannel) {
    return configuredChannel;
  }

  if (
    interaction.channel &&
    interaction.channel.type === ChannelType.GuildText
  ) {
    return interaction.channel;
  }

  return null;
}

module.exports = {
  customId: "setupwizard_panelrebuild_confirm",

  async execute(interaction, client) {
    if (!hasAdminAccess(interaction)) {
      return interaction.reply({
        content: "❌ Du brauchst **Server verwalten** oder **Administrator**.",
        flags: MessageFlags.Ephemeral
      });
    }

    const targetChannel = findRebuildTargetChannel(interaction);

    if (!targetChannel) {
      return interaction.update({
        content:
          "❌ Kein geeigneter Textchannel für den Zentralpanel-Rebuild gefunden.\n\n" +
          "Öffne den Setupwizard bitte in einem Textchannel oder erstelle den Panelchannel.",
        embeds: [],
        components: []
      });
    }

    await interaction.update({
      content: "🧹 Zentralpanel wird in " + targetChannel.toString() + " neu aufgebaut...",
      embeds: [],
      components: []
    });

    try {
      const result = await rebuildPanelChannel(
        targetChannel,
        client || interaction.client,
        {
          includeUserMessages: false
        }
      );

      return interaction.editReply(
        "✅ Zentralpanel wurde neu aufgebaut.\n\n" +
        "Channel: " + targetChannel.toString() + "\n" +
        "Gelöschte Bot-Nachrichten: **" + result.cleanup.deleted + "**\n" +
        "Geprüfte Nachrichten: **" + result.cleanup.scanned + "**\n" +
        "Neue Panel-Nachrichten: **" + result.created + "**"
      );
    } catch (err) {
      console.error("❌ Setupwizard Panel-Rebuild Fehler:", err.message);

      return interaction.editReply(
        "❌ Zentralpanel-Rebuild fehlgeschlagen. Details stehen im Bot-Log."
      );
    }
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const { PANEL_CHANNEL_NAME } = require("../utils/panelChannel");

const LEGACY_PANEL_CHANNELS = [
  "music-player",
  "gluecksrad"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panelcleanup")
    .setDescription("Findet oder löscht alte einzelne Panel-Channels")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addBooleanOption(option =>
      option
        .setName("loeschen")
        .setDescription("Alte Panel-Channels wirklich löschen?")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const shouldDelete = interaction.options.getBoolean("loeschen") || false;

    const oldChannels = interaction.guild.channels.cache.filter(channel =>
      channel &&
      channel.type === ChannelType.GuildText &&
      channel.name !== PANEL_CHANNEL_NAME &&
      LEGACY_PANEL_CHANNELS.includes(channel.name)
    );

    if (oldChannels.size === 0) {
      return interaction.editReply(
        "✅ Keine alten Einzel-Panel-Channels gefunden."
      );
    }

    if (!shouldDelete) {
      const list = oldChannels
        .map(channel => "- " + channel.toString())
        .join("\n");

      return interaction.editReply(
        "⚠️ Alte Einzel-Panel-Channels gefunden:\n\n" +
        list +
        "\n\nZum Löschen nutze:\n" +
        "`/panelcleanup loeschen:Ja`"
      );
    }

    const deleted = [];

    for (const channel of oldChannels.values()) {
      try {
        deleted.push("#" + channel.name);
        await channel.delete("TempVoicePro: alte Einzel-Panel-Channels entfernt");
      } catch (err) {
        console.error("❌ Alter Panel-Channel konnte nicht gelöscht werden:", err.message);
      }
    }

    return interaction.editReply(
      "🧹 Alte Einzel-Panel-Channels entfernt:\n\n" +
      deleted.map(name => "- " + name).join("\n")
    );
  }
};

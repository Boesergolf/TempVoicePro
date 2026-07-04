const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const {
  getOrCreatePanelChannel,
  findPanelMessage,
  cleanupDuplicatePanelMessages,
  pinPanelMessage,
  cleanupPanelChannelMessages
} = require("../utils/panelChannel");

const {
  createMusicPanelEmbed,
  createMusicPanelRows
} = require("../utils/musicPanelView");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("musicpanel")
    .setDescription("Erstellt oder aktualisiert das Music Panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName("kategorie")
        .setDescription("In welcher Kategorie soll der Panel-Channel erstellt oder verschoben werden?")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildCategory)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const category = interaction.options.getChannel("kategorie");
    const panelChannel = await getOrCreatePanelChannel(interaction.guild, category.id);
    const botId = interaction.client.user.id;

    const deletedMessages = await cleanupPanelChannelMessages(panelChannel, botId);

    const existingPanel = await findPanelMessage(
      panelChannel,
      botId,
      "Music Player"
    );

    if (existingPanel) {
      await existingPanel.edit({
        embeds: [createMusicPanelEmbed(interaction.guild.id)],
        components: createMusicPanelRows()
      });

      await pinPanelMessage(existingPanel);

      await cleanupDuplicatePanelMessages(
        panelChannel,
        botId,
        "Music Player",
        existingPanel.id
      );

      return interaction.editReply(
        "✅ Music Player Panel wurde aktualisiert in " + panelChannel.toString() +
        "\n📁 Kategorie: **" + category.name + "**" +
        "\n🧹 Aufgeräumte Nachrichten: **" + deletedMessages + "**"
      );
    }

    const message = await panelChannel.send({
      embeds: [createMusicPanelEmbed(interaction.guild.id)],
      components: createMusicPanelRows()
    });

    await pinPanelMessage(message);

    await cleanupDuplicatePanelMessages(
      panelChannel,
      botId,
      "Music Player",
      message.id
    );

    return interaction.editReply(
      "✅ Music Player Panel wurde erstellt in " + panelChannel.toString() +
      "\n📁 Kategorie: **" + category.name + "**" +
      "\n🧹 Aufgeräumte Nachrichten: **" + deletedMessages + "**"
    );
  }
};

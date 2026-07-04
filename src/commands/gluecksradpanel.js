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
  createLuckWheelPanelEmbed,
  createLuckWheelPanelRows
} = require("../utils/luckWheel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gluecksradpanel")
    .setDescription("Erstellt oder aktualisiert das Glücksrad Panel")
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
      "Glücksrad Panel"
    );

    if (existingPanel) {
      await existingPanel.edit({
        embeds: [createLuckWheelPanelEmbed()],
        components: createLuckWheelPanelRows()
      });

      await pinPanelMessage(existingPanel);

      await cleanupDuplicatePanelMessages(
        panelChannel,
        botId,
        "Glücksrad Panel",
        existingPanel.id
      );

      return interaction.editReply(
        "✅ Glücksrad Panel wurde aktualisiert in " + panelChannel.toString() +
        "\n📁 Kategorie: **" + category.name + "**" +
        "\n🧹 Aufgeräumte Nachrichten: **" + deletedMessages + "**"
      );
    }

    const message = await panelChannel.send({
      embeds: [createLuckWheelPanelEmbed()],
      components: createLuckWheelPanelRows()
    });

    await pinPanelMessage(message);

    await cleanupDuplicatePanelMessages(
      panelChannel,
      botId,
      "Glücksrad Panel",
      message.id
    );

    return interaction.editReply(
      "✅ Glücksrad Panel wurde erstellt in " + panelChannel.toString() +
      "\n📁 Kategorie: **" + category.name + "**" +
      "\n🧹 Aufgeräumte Nachrichten: **" + deletedMessages + "**"
    );
  }
};

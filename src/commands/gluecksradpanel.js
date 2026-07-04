const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const {
  createLuckWheelPanelEmbed,
  createLuckWheelPanelRows
} = require("../utils/luckWheel");

async function findPanelMessage(channel, botId) {
  const messages = await channel.messages.fetch({ limit: 50 });

  return messages.find(message =>
    message.author &&
    message.author.id === botId &&
    message.embeds &&
    message.embeds.some(embed =>
      String(embed.title || "").includes("Glücksrad Panel")
    )
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gluecksradpanel")
    .setDescription("Erstellt oder aktualisiert das Glücksrad Panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const guild = interaction.guild;
    const channelName = "gluecksrad";

    let panelChannel = guild.channels.cache.find(channel =>
      channel &&
      channel.type === ChannelType.GuildText &&
      channel.name === channelName
    );

    if (!panelChannel) {
      panelChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: "Glücksrad Panel für Karten, Maps und Team-Auswahl"
      });
    }

    const existingPanel = await findPanelMessage(
      panelChannel,
      interaction.client.user.id
    );

    if (existingPanel) {
      await existingPanel.edit({
        embeds: [createLuckWheelPanelEmbed()],
        components: createLuckWheelPanelRows()
      });

      return interaction.editReply(
        "✅ Glücksrad Panel wurde aktualisiert in " + panelChannel.toString()
      );
    }

    await panelChannel.send({
      embeds: [createLuckWheelPanelEmbed()],
      components: createLuckWheelPanelRows()
    });

    return interaction.editReply(
      "✅ Glücksrad Panel wurde erstellt in " + panelChannel.toString()
    );
  }
};

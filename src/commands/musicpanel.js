const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const {
  createMusicPanelEmbed,
  createMusicPanelRows
} = require("../utils/musicPanelView");

async function findPanelMessages(channel, botId) {
  const messages = await channel.messages.fetch({ limit: 50 });

  return messages.filter(message =>
    message.author &&
    message.author.id === botId &&
    message.embeds &&
    message.embeds.some(embed =>
      String(embed.title || "").includes("Music Player")
    )
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("musicpanel")
    .setDescription("Erstellt oder aktualisiert den Music Player Channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const guild = interaction.guild;
    const channelName = "music-player";

    let panelChannel = guild.channels.cache.find(channel =>
      channel &&
      channel.type === ChannelType.GuildText &&
      channel.name === channelName
    );

    if (!panelChannel) {
      panelChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: "Music Player Control Panel für TempVoicePro"
      });
    }

    const panelMessages = await findPanelMessages(
      panelChannel,
      interaction.client.user.id
    );

    const panels = Array.from(panelMessages.values());

    if (panels.length > 0) {
      const newestPanel = panels[0];

      await newestPanel.edit({
        embeds: [createMusicPanelEmbed(guild.id)],
        components: createMusicPanelRows()
      });

      for (const oldPanel of panels.slice(1)) {
        await oldPanel.delete().catch(() => {});
      }

      return interaction.editReply(
        "✅ Music Player Panel wurde aktualisiert in " + panelChannel.toString()
      );
    }

    await panelChannel.send({
      embeds: [createMusicPanelEmbed(guild.id)],
      components: createMusicPanelRows()
    });

    return interaction.editReply(
      "✅ Music Player Panel wurde erstellt in " + panelChannel.toString()
    );
  }
};

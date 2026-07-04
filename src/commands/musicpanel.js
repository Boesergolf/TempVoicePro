const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("musicpanel")
    .setDescription("Erstellt einen Music Player Channel mit Buttons")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

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

    const embed = new EmbedBuilder()
      .setTitle("🎵 Music Player")
      .setColor("Orange")
      .setDescription(
        "Steuere den Musikplayer direkt über die Buttons.\n\n" +
        "Du musst zum Abspielen in einem Voice Channel sein."
      )
      .setFooter({
        text: "TempVoicePro Music Panel"
      });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mp_play")
        .setLabel("▶ Play")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("mp_playlist")
        .setLabel("📂 Playlist")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("mp_queue")
        .setLabel("📜 Queue")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("mp_now")
        .setLabel("🎵 Now")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("mp_skip")
        .setLabel("⏭ Skip")
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mp_pause")
        .setLabel("⏸ Pause")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("mp_resume")
        .setLabel("▶ Resume")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("mp_stop")
        .setLabel("⏹ Stop")
        .setStyle(ButtonStyle.Danger)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mp_clear")
        .setLabel("🧹 Clear")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("mp_shuffle")
        .setLabel("🔀 Shuffle")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("mp_remove")
        .setLabel("🗑 Remove")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("mp_volume")
        .setLabel("🔊 Volume")
        .setStyle(ButtonStyle.Primary)
    );

    await panelChannel.send({
      embeds: [embed],
      components: [row1, row2, row3]
    });

    return interaction.editReply(
      "✅ Music Player Panel wurde erstellt in " + panelChannel.toString()
    );
  }
};

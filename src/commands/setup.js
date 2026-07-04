const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const db = require("../database/mysql");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("TempVoice System einrichten")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName("creator")
        .setDescription("Creator Voice Channel")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("category")
        .setDescription("Kategorie für TempVoice Channels")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    ),

  async execute(interaction) {
    const creator = interaction.options.getChannel("creator", true);
    const category = interaction.options.getChannel("category", true);

    await db.execute(
      `INSERT INTO guild_settings
       (guildId, creatorChannelId, categoryId)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         creatorChannelId = VALUES(creatorChannelId),
         categoryId = VALUES(categoryId)`,
      [interaction.guild.id, creator.id, category.id]
    );

    const embed = new EmbedBuilder()
      .setTitle("✅ TempVoice eingerichtet")
      .setColor("Green")
      .addFields(
        {
          name: "🎤 Creator Channel",
          value: `${creator}`,
          inline: true
        },
        {
          name: "📂 Kategorie",
          value: `${category}`,
          inline: true
        }
      )
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};

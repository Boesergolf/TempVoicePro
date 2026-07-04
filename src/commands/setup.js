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
        .setDescription("Optional: bestehenden Creator Voice Channel auswählen")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false)
    )

    .addChannelOption(option =>
      option
        .setName("category")
        .setDescription("Optional: bestehende Kategorie auswählen")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    ),

  async execute(interaction) {
    const guild = interaction.guild;

    const botMember = guild.members.me;

    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: "❌ Mir fehlt die Berechtigung **Kanäle verwalten**.",
        flags: 64
      });
    }

    await interaction.deferReply({ flags: 64 });

    let creator = interaction.options.getChannel("creator");
    let category = interaction.options.getChannel("category");

    if (!category) {
      category = await guild.channels.create({
        name: "🎧 TempVoice",
        type: ChannelType.GuildCategory
      });
    }

    if (!creator) {
      creator = await guild.channels.create({
        name: "➕ Create Voice",
        type: ChannelType.GuildVoice,
        parent: category.id,
        userLimit: 0
      });
    } else if (category && creator.parentId !== category.id) {
      await creator.setParent(category.id);
    }

    await db.execute(
      `INSERT INTO guild_settings
       (guildId, creatorChannelId, categoryId)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         creatorChannelId = VALUES(creatorChannelId),
         categoryId = VALUES(categoryId)`,
      [guild.id, creator.id, category.id]
    );

    const embed = new EmbedBuilder()
      .setTitle("✅ TempVoice eingerichtet")
      .setColor("Green")
      .setDescription("Das TempVoice System wurde erfolgreich eingerichtet.")
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

    return interaction.editReply({
      embeds: [embed]
    });
  }
};

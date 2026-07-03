const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const db = require("../database/mysql");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Richtet das TempVoice System ein")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;

    // 1. Kategorie erstellen
    const category = await guild.channels.create({
      name: "🎧 TempVoice",
      type: ChannelType.GuildCategory
    });

    // 2. Creator Channel erstellen
    const creator = await guild.channels.create({
      name: "➕ Create Voice",
      type: ChannelType.GuildVoice,
      parent: category.id
    });

    // 3. In MySQL speichern
    await db.execute(
      `INSERT INTO guild_settings (guildId, creatorChannelId, categoryId)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
       creatorChannelId = VALUES(creatorChannelId),
       categoryId = VALUES(categoryId)`,
      [guild.id, creator.id, category.id]
    );

    await interaction.reply({
      content: "✅ TempVoice System erfolgreich eingerichtet!",
      ephemeral: true
    });
  }
};
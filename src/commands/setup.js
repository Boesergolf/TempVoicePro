const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const db = require("../database/mysql");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("TempVoice System einrichten")

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
        .setDescription("TempVoice Kategorie")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )

    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  async execute(interaction) {

    const creator = interaction.options.getChannel("creator");
    const category = interaction.options.getChannel("category");

    const guildId = interaction.guild.id;

    // Prüfen ob Server bereits existiert
    const [rows] = await db.execute(
      "SELECT guildId FROM guild_settings WHERE guildId = ?",
      [guildId]
    );

    if (rows.length === 0) {

      await db.execute(
        `INSERT INTO guild_settings
        (guildId, creatorChannelId, categoryId)
        VALUES (?, ?, ?)`,
        [
          guildId,
          creator.id,
          category.id
        ]
      );

    } else {

      await db.execute(
        `UPDATE guild_settings
        SET creatorChannelId = ?, categoryId = ?
        WHERE guildId = ?`,
        [
          creator.id,
          category.id,
          guildId
        ]
      );

    }

    return interaction.reply({
      content:
`✅ TempVoice erfolgreich eingerichtet!

🎤 Creator:
${creator}

📂 Kategorie:
${category}`,
      ephemeral: true
    });

  }
};

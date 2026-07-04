const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database/mysql");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Zeigt TempVoice Statistiken an"),

  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;

      const [[active]] = await db.execute(
        "SELECT COUNT(*) AS count FROM temp_channels WHERE guildId = ?",
        [guildId]
      );

      const [[settings]] = await db.execute(
        "SELECT COUNT(*) AS count FROM guild_settings WHERE guildId = ?",
        [guildId]
      );

      const embed = new EmbedBuilder()
        .setTitle("📊 TempVoice Statistiken")
        .setColor("Blue")
        .addFields(
          {
            name: "Aktive Temp-Channels",
            value: String(active.count),
            inline: true
          },
          {
            name: "Setup vorhanden",
            value: settings.count > 0 ? "✅ Ja" : "❌ Nein",
            inline: true
          }
        )
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    } catch (err) {
      console.error("❌ Stats Fehler:", err);

      return interaction.reply({
        content: "❌ Fehler beim Laden der Statistiken.",
        ephemeral: true
      });
    }
  }
};

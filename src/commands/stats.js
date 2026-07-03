const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Zeigt TempVoice Statistiken"),

  async execute(interaction) {

    const total = db.prepare(
      "SELECT COUNT(*) as count FROM temp_channels"
    ).get();

    const active = interaction.guild.channels.cache.filter(c =>
      c.name.includes("'s Channel")
    ).size;

    const embed = new EmbedBuilder()
      .setTitle("📊 TempVoice Stats")
      .addFields(
        { name: "📦 Insgesamt erstellt", value: String(total.count), inline: true },
        { name: "🔊 Aktive Channels", value: String(active), inline: true }
      )
      .setColor("Blue");

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
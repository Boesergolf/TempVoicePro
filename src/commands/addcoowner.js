const { SlashCommandBuilder } = require("discord.js");
const db = require("../database/mysql");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addcoowner")
    .setDescription("Fügt einen Co-Owner hinzu")
    .addUserOption(opt =>
      opt.setName("user").setDescription("User").setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: "❌ Kein Channel", ephemeral: true });

    const user = interaction.options.getUser("user");

    const [rows] = await db.execute(
      "SELECT * FROM temp_permissions WHERE channelId = ?",
      [channel.id]
    );

    if (!rows[0]) return interaction.reply({ content: "❌ Kein Temp Channel", ephemeral: true });

    const data = rows[0];
    const coOwners = JSON.parse(data.coOwners || "[]");

    if (!coOwners.includes(user.id)) {
      coOwners.push(user.id);
    }

    await db.execute(
      "UPDATE temp_permissions SET coOwners = ? WHERE channelId = ?",
      [JSON.stringify(coOwners), channel.id]
    );

    return interaction.reply({
      content: `👑 ${user.username} ist jetzt Co-Owner`,
      ephemeral: true
    });
  }
};
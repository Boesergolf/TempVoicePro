const { SlashCommandBuilder } = require("discord.js");
const db = require("../database/mysql");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removecoowner")
    .setDescription("Entfernt einen Co-Owner")
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

    let coOwners = JSON.parse(rows[0].coOwners || "[]");
    coOwners = coOwners.filter(id => id !== user.id);

    await db.execute(
      "UPDATE temp_permissions SET coOwners = ? WHERE channelId = ?",
      [JSON.stringify(coOwners), channel.id]
    );

    return interaction.reply({
      content: `❌ ${user.username} ist kein Co-Owner mehr`,
      ephemeral: true
    });
  }
};
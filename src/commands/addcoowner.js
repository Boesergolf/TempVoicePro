const { SlashCommandBuilder } = require("discord.js");
const db = require("../database/mysql");
const { isOwner } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addcoowner")
    .setDescription("Fügt einen Co-Owner zu deinem TempVoice Channel hinzu")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User, der Co-Owner werden soll")
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.member?.voice?.channel;

    if (!channel) {
      return interaction.reply({
        content: "❌ Du bist in keinem Voice Channel.",
        ephemeral: true
      });
    }

    const owner = await isOwner(interaction.user.id, channel.id);

    if (!owner) {
      return interaction.reply({
        content: "❌ Nur der Channel Owner darf Co-Owner hinzufügen.",
        ephemeral: true
      });
    }

    const user = interaction.options.getUser("user", true);

    if (user.bot) {
      return interaction.reply({
        content: "❌ Bots können keine Co-Owner werden.",
        ephemeral: true
      });
    }

    if (user.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ Du bist bereits Owner dieses Channels.",
        ephemeral: true
      });
    }

    const [rows] = await db.execute(
      "SELECT * FROM temp_permissions WHERE channelId = ?",
      [channel.id]
    );

    const data = rows[0];

    if (!data) {
      return interaction.reply({
        content: "❌ Das ist kein TempVoice Channel.",
        ephemeral: true
      });
    }

    let coOwners = [];

    try {
      coOwners = JSON.parse(data.coOwners || "[]");
    } catch {
      coOwners = [];
    }

    if (coOwners.includes(user.id)) {
      return interaction.reply({
        content: `ℹ️ ${user} ist bereits Co-Owner.`,
        ephemeral: true
      });
    }

    coOwners.push(user.id);

    await db.execute(
      "UPDATE temp_permissions SET coOwners = ? WHERE channelId = ?",
      [JSON.stringify(coOwners), channel.id]
    );

    return interaction.reply({
      content: `⭐ ${user} ist jetzt Co-Owner.`,
      ephemeral: true
    });
  }
};

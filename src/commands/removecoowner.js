const { SlashCommandBuilder } = require("discord.js");
const db = require("../database/mysql");
const { isOwner } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removecoowner")
    .setDescription("Entfernt einen Co-Owner aus deinem TempVoice Channel")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User, der entfernt werden soll")
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
        content: "❌ Nur der Channel Owner darf Co-Owner entfernen.",
        ephemeral: true
      });
    }

    const user = interaction.options.getUser("user", true);

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

    if (!coOwners.includes(user.id)) {
      return interaction.reply({
        content: `ℹ️ ${user} ist kein Co-Owner.`,
        ephemeral: true
      });
    }

    coOwners = coOwners.filter(id => id !== user.id);

    await db.execute(
      "UPDATE temp_permissions SET coOwners = ? WHERE channelId = ?",
      [JSON.stringify(coOwners), channel.id]
    );

    return interaction.reply({
      content: `🗑️ ${user} ist kein Co-Owner mehr.`,
      ephemeral: true
    });
  }
};

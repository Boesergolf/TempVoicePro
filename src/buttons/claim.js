const db = require("../database/mysql");

module.exports = {
  customId: "tv_claim",

  async execute(interaction) {
    const channel = interaction.member?.voice?.channel;

    if (!channel) {
      return interaction.reply({
        content: "❌ Du bist in keinem Voice Channel.",
        flags: 64
      });
    }

    const [rows] = await db.execute(
      "SELECT ownerId FROM temp_permissions WHERE channelId = ?",
      [channel.id]
    );

    const data = rows[0];

    if (!data) {
      return interaction.reply({
        content: "❌ Dieser Voice Channel ist kein TempVoice Channel.",
        flags: 64
      });
    }

    if (data.ownerId === interaction.user.id) {
      return interaction.reply({
        content: "👑 Du bist bereits Owner dieses Channels.",
        flags: 64
      });
    }

    const oldOwnerStillInside = data.ownerId && channel.members.has(data.ownerId);

    if (oldOwnerStillInside) {
      return interaction.reply({
        content: "❌ Der aktuelle Owner ist noch im Channel. Du kannst ihn nicht claimen.",
        flags: 64
      });
    }

    await db.execute(
      "UPDATE temp_permissions SET ownerId = ? WHERE channelId = ?",
      [interaction.user.id, channel.id]
    );

    await db.execute(
      "UPDATE temp_channels SET ownerId = ? WHERE channelId = ?",
      [interaction.user.id, channel.id]
    );

    return interaction.reply({
      content: "👑 Du bist jetzt Owner dieses TempVoice Channels.",
      flags: 64
    });
  }
};

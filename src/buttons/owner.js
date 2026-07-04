const db = require("../database/mysql");

module.exports = {
  customId: "tv_owner",

  async execute(interaction) {
    const channel = interaction.member?.voice?.channel;

    if (!channel) {
      return interaction.reply({
        content: "❌ Du bist in keinem Voice Channel.",
        ephemeral: true
      });
    }

    const [rows] = await db.execute(
      "SELECT ownerId, coOwners FROM temp_permissions WHERE channelId = ?",
      [channel.id]
    );

    const data = rows[0];

    if (!data) {
      return interaction.reply({
        content: "❌ Dieser Voice Channel ist kein TempVoice Channel.",
        ephemeral: true
      });
    }

    let coOwners = [];

    try {
      coOwners = JSON.parse(data.coOwners || "[]");
    } catch {
      coOwners = [];
    }

    const ownerText = data.ownerId ? "<@" + data.ownerId + ">" : "Kein Owner";
    const coOwnerText = coOwners.length > 0
      ? coOwners.map(id => "<@" + id + ">").join(", ")
      : "Keine Co-Owner";

    return interaction.reply({
      content:
        "👑 **Aktueller Owner:** " + ownerText + "\n" +
        "🤝 **Co-Owner:** " + coOwnerText,
      ephemeral: true
    });
  }
};

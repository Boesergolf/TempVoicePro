const db = require("../database/mysql");

function formatList(rows) {
  if (!rows || rows.length === 0) {
    return "Keine gefunden.";
  }

  return rows
    .slice(0, 20)
    .map((row, index) => (index + 1) + ". " + row.name)
    .join("\n");
}

module.exports = {
  customId: "mp_playlists",

  async execute(interaction) {
    const [userRows] = await db.execute(
      "SELECT name FROM music_playlists WHERE guildId = ? AND ownerKey = ? AND scope = ? ORDER BY name ASC LIMIT 20",
      [interaction.guild.id, interaction.user.id, "user"]
    );

    const [globalRows] = await db.execute(
      "SELECT name FROM music_playlists WHERE guildId = ? AND ownerKey = ? AND scope = ? ORDER BY name ASC LIMIT 20",
      [interaction.guild.id, "GLOBAL", "global"]
    );

    return interaction.reply({
      content:
        "📋 **Gespeicherte Playlists**\n\n" +
        "👤 **Deine Playlists:**\n" +
        formatList(userRows) +
        "\n\n🌍 **Globale Playlists:**\n" +
        formatList(globalRows),
      flags: 64
    });
  }
};

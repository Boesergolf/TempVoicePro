const db = require("../database/mysql");

const {
  getQueue
} = require("../utils/musicPlayer");

const {
  createMusicCentralMessage
} = require("../utils/panelHubMusic");

async function getOrCreateFavoritesPlaylist(interaction) {
  const guildId = interaction.guild.id;
  const ownerKey = interaction.user.id;
  const scope = "user";
  const name = "Favorites";

  const [rows] = await db.execute(
    "SELECT * FROM music_playlists WHERE guildId = ? AND ownerKey = ? AND scope = ? AND name = ? LIMIT 1",
    [guildId, ownerKey, scope, name]
  );

  if (rows.length > 0) {
    return rows[0];
  }

  const [result] = await db.execute(
    "INSERT INTO music_playlists (guildId, ownerKey, scope, name, createdAt) VALUES (?, ?, ?, ?, NOW())",
    [guildId, ownerKey, scope, name]
  );

  return {
    id: result.insertId,
    guildId,
    ownerKey,
    scope,
    name
  };
}

async function getNextPosition(playlistId) {
  const [rows] = await db.execute(
    "SELECT COALESCE(MAX(position), 0) AS maxPosition FROM music_playlist_items WHERE playlistId = ?",
    [playlistId]
  );

  return Number(rows[0]?.maxPosition || 0) + 1;
}

async function isAlreadyFavorite(playlistId, url, title) {
  const [rows] = await db.execute(
    "SELECT id FROM music_playlist_items WHERE playlistId = ? AND (url = ? OR title = ?) LIMIT 1",
    [playlistId, url, title]
  );

  return rows.length > 0;
}

module.exports = {
  customId: "mp_favorite",

  async execute(interaction) {
    await interaction.deferUpdate().catch(() => null);

    const queue = getQueue(interaction.guild.id);

    if (!queue || !queue.current) {
      return interaction.message.edit(
        createMusicCentralMessage(interaction.guild.id)
      ).catch(() => null);
    }

    const current = queue.current;

    const title =
      current.title ||
      current.query ||
      current.url ||
      "Unbekannter Track";

    const url =
      current.originalUrl ||
      current.url ||
      null;

    if (!url) {
      return interaction.message.edit(
        createMusicCentralMessage(interaction.guild.id)
      ).catch(() => null);
    }

    const playlist = await getOrCreateFavoritesPlaylist(interaction);
    const exists = await isAlreadyFavorite(playlist.id, url, title);

    if (!exists) {
      const position = await getNextPosition(playlist.id);

      await db.execute(
        "INSERT INTO music_playlist_items (playlistId, source, title, url, addedBy, position, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [
          playlist.id,
          current.originalSource || current.source || "youtube",
          title,
          url,
          interaction.user.id,
          position
        ]
      );
    }

    return interaction.message.edit(
      createMusicCentralMessage(interaction.guild.id)
    ).catch(() => null);
  }
};

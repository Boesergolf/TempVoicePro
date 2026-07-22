const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const db = require("../database/mysql");
const { getMetadataForUrl } = require("../utils/musicMetadata");
const { importPlaylistFromUrl } = require("../utils/musicImport");

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function getScope(interaction) {
  return interaction.options.getString("scope") || "user";
}

function getOwnerKey(scope, userId) {
  return scope === "global" ? "GLOBAL" : userId;
}

function canManageGlobal(interaction) {
  return interaction.memberPermissions &&
    interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
}

function detectSource(url) {
  const lower = url.toLowerCase();

  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return "youtube";
  }

  if (lower.includes("spotify.com")) {
    return "spotify";
  }

  return "url";
}

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function findPlaylist(guildId, userId, scope, name) {
  const ownerKey = getOwnerKey(scope, userId);

  const [rows] = await db.execute(
    `SELECT *
     FROM music_playlists
     WHERE guildId = ?
       AND ownerKey = ?
       AND scope = ?
       AND name = ?`,
    [guildId, ownerKey, scope, name]
  );

  return rows[0] || null;
}

function sourceIcon(source) {
  if (source === "youtube") return "▶️";
  if (source === "spotify") return "🟢";
  return "🔗";
}

function makeItemLine(item) {
  const title = item.title || item.url;
  const safeTitle = String(title).replace(/\]/g, "\\]");
  return item.position + ". " + sourceIcon(item.source) + " [" + safeTitle + "](" + item.url + ")";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("YouTube/Spotify Playlists speichern und verwalten")

    .addSubcommand(sub =>
      sub
        .setName("create")
        .setDescription("Neue Playlist erstellen")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Name der Playlist")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName("scope")
            .setDescription("User Playlist oder globale Server Playlist")
            .setRequired(true)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Global", value: "global" }
            )
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("Playlists anzeigen")
        .addStringOption(option =>
          option
            .setName("scope")
            .setDescription("User oder globale Playlists")
            .setRequired(false)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Global", value: "global" }
            )
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Link zu einer Playlist hinzufügen")
        .addStringOption(option =>
          option
            .setName("playlist")
            .setDescription("Name der Playlist")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName("url")
            .setDescription("YouTube, Spotify oder anderer Link")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("title")
            .setDescription("Optionaler Titel")
            .setRequired(false)
            .setMaxLength(200)
        )
        .addStringOption(option =>
          option
            .setName("scope")
            .setDescription("User oder globale Playlist")
            .setRequired(false)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Global", value: "global" }
            )
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("show")
        .setDescription("Inhalt einer Playlist anzeigen")
        .addStringOption(option =>
          option
            .setName("playlist")
            .setDescription("Name der Playlist")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName("scope")
            .setDescription("User oder globale Playlist")
            .setRequired(false)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Global", value: "global" }
            )
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("import")
        .setDescription("Spotify- oder YouTube-Playlist importieren")
        .addStringOption(option =>
          option
            .setName("playlist")
            .setDescription("Name der Bot-Playlist")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName("url")
            .setDescription("Spotify-Playlist oder YouTube-Playlist Link")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("scope")
            .setDescription("User oder globale Playlist")
            .setRequired(false)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Global", value: "global" }
            )
        )
        .addIntegerOption(option =>
          option
            .setName("limit")
            .setDescription("Maximale Anzahl Einträge")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(300)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Eintrag aus einer Playlist entfernen")
        .addStringOption(option =>
          option
            .setName("playlist")
            .setDescription("Name der Playlist")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addIntegerOption(option =>
          option
            .setName("position")
            .setDescription("Nummer des Eintrags")
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option
            .setName("scope")
            .setDescription("User oder globale Playlist")
            .setRequired(false)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Global", value: "global" }
            )
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("delete")
        .setDescription("Playlist löschen")
        .addStringOption(option =>
          option
            .setName("playlist")
            .setDescription("Name der Playlist")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName("scope")
            .setDescription("User oder globale Playlist")
            .setRequired(false)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Global", value: "global" }
            )
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "create") {
        const name = normalizeName(interaction.options.getString("name"));
        const scope = getScope(interaction);

        if (scope === "global" && !canManageGlobal(interaction)) {
          return interaction.editReply(
            "❌ Globale Playlists dürfen nur Mitglieder mit **Server verwalten** erstellen."
          );
        }

        const ownerKey = getOwnerKey(scope, userId);

        const existing = await findPlaylist(guildId, userId, scope, name);

        if (existing) {
          return interaction.editReply("❌ Diese Playlist existiert bereits.");
        }

        await db.execute(
          `INSERT INTO music_playlists
           (guildId, ownerKey, scope, name, createdAt)
           VALUES (?, ?, ?, ?, ?)`,
          [guildId, ownerKey, scope, name, Date.now()]
        );

        return interaction.editReply(
          "✅ Playlist **" + name + "** wurde erstellt. Scope: **" + scope + "**"
        );
      }

      if (subcommand === "list") {
        const scope = getScope(interaction);
        const ownerKey = getOwnerKey(scope, userId);

        const [rows] = await db.execute(
          `SELECT p.id, p.name, p.scope,
            (SELECT COUNT(*) FROM music_playlist_items i WHERE i.playlistId = p.id) AS itemCount
           FROM music_playlists p
           WHERE p.guildId = ?
             AND p.ownerKey = ?
             AND p.scope = ?
           ORDER BY p.name ASC`,
          [guildId, ownerKey, scope]
        );

        if (rows.length === 0) {
          return interaction.editReply("❌ Keine Playlists gefunden.");
        }

        const text = rows
          .map(row => "🎵 **" + row.name + "** - " + row.itemCount + " Einträge")
          .join("\n");

        const embed = new EmbedBuilder()
          .setTitle(scope === "global" ? "🌐 Globale Playlists" : "👤 Deine Playlists")
          .setColor("Blue")
          .setDescription(text);

        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === "add") {
        const name = normalizeName(interaction.options.getString("playlist"));
        const url = interaction.options.getString("url").trim();
        const titleRaw = interaction.options.getString("title");
        let title = titleRaw ? titleRaw.trim() : null;
        const scope = getScope(interaction);

        if (scope === "global" && !canManageGlobal(interaction)) {
          return interaction.editReply(
            "❌ Globale Playlists dürfen nur Mitglieder mit **Server verwalten** bearbeiten."
          );
        }

        if (!validateUrl(url)) {
          return interaction.editReply("❌ Bitte gib eine gültige URL ein.");
        }

        const playlist = await findPlaylist(guildId, userId, scope, name);

        if (!playlist) {
          return interaction.editReply("❌ Playlist wurde nicht gefunden.");
        }

        const [positionRows] = await db.execute(
          `SELECT COALESCE(MAX(position), 0) + 1 AS nextPosition
           FROM music_playlist_items
           WHERE playlistId = ?`,
          [playlist.id]
        );

        const nextPosition = positionRows[0].nextPosition || 1;

        let source = detectSource(url);

        if (!title) {
          const metadata = await getMetadataForUrl(url);

          if (metadata) {
            source = metadata.source || source;
            title = metadata.displayTitle || metadata.title || title;
          }
        }

        await db.execute(
          `INSERT INTO music_playlist_items
           (playlistId, source, title, url, addedBy, position, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            playlist.id,
            source,
            title,
            url,
            userId,
            nextPosition,
            Date.now()
          ]
        );

        const titleText = title
          ? "\nTitel: **" + String(title).replace(/\*/g, "") + "**"
          : "";

        return interaction.editReply(
          "✅ Eintrag wurde zu **" + playlist.name + "** hinzugefügt.\n" +
          "Position: **" + nextPosition + "**\n" +
          "Quelle: **" + source + "**" +
          titleText
        );
      }

      if (subcommand === "show") {
        const name = normalizeName(interaction.options.getString("playlist"));
        const scope = getScope(interaction);

        const playlist = await findPlaylist(guildId, userId, scope, name);

        if (!playlist) {
          return interaction.editReply("❌ Playlist wurde nicht gefunden.");
        }

        const [items] = await db.execute(
          `SELECT *
           FROM music_playlist_items
           WHERE playlistId = ?
           ORDER BY position ASC
           LIMIT 25`,
          [playlist.id]
        );

        const [countRows] = await db.execute(
          `SELECT COUNT(*) AS count
           FROM music_playlist_items
           WHERE playlistId = ?`,
          [playlist.id]
        );

        const total = countRows[0].count || 0;

        let description = "Noch keine Einträge.";

        if (items.length > 0) {
          description = items.map(makeItemLine).join("\n");

          if (total > 25) {
            description += "\n\n... und " + (total - 25) + " weitere Einträge.";
          }
        }

        if (description.length > 3900) {
          description = description.slice(0, 3900) + "\n...";
        }

        const embed = new EmbedBuilder()
          .setTitle("🎵 Playlist: " + playlist.name)
          .setColor("Green")
          .setDescription(description)
          .setFooter({
            text: "Scope: " + playlist.scope + " | Einträge: " + total
          });

        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === "import") {
        const name = normalizeName(interaction.options.getString("playlist"));
        const url = interaction.options.getString("url").trim();
        const scope = getScope(interaction);
        const limit = interaction.options.getInteger("limit") || 300;

        if (scope === "global" && !canManageGlobal(interaction)) {
          return interaction.editReply(
            "❌ Globale Playlists dürfen nur Mitglieder mit **Server verwalten** importieren."
          );
        }

        if (!validateUrl(url) && !url.startsWith("spotify:playlist:")) {
          return interaction.editReply("❌ Bitte gib eine gültige Playlist-URL ein.");
        }

        const ownerKey = getOwnerKey(scope, userId);

        let playlist = await findPlaylist(guildId, userId, scope, name);

        if (!playlist) {
          await db.execute(
            `INSERT INTO music_playlists
             (guildId, ownerKey, scope, name, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [guildId, ownerKey, scope, name, Date.now()]
          );

          playlist = await findPlaylist(guildId, userId, scope, name);
        }

        await interaction.editReply(
          "⏳ Import läuft... Bitte kurz warten."
        );

        let importedItems;

        try {
          importedItems = await importPlaylistFromUrl(url, limit);
        } catch (error) {
          if (error && error.isUserFacing) {
            return interaction.editReply(error.message);
          }

          throw error;
        }

        if (!importedItems.length) {
          return interaction.editReply(
            "❌ Es wurden keine importierbaren Einträge gefunden."
          );
        }

        const [positionRows] = await db.execute(
          `SELECT COALESCE(MAX(position), 0) + 1 AS nextPosition
           FROM music_playlist_items
           WHERE playlistId = ?`,
          [playlist.id]
        );

        let position = positionRows[0].nextPosition || 1;
        let inserted = 0;

        for (const item of importedItems) {
          await db.execute(
            `INSERT INTO music_playlist_items
             (playlistId, source, title, url, addedBy, position, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              playlist.id,
              item.source,
              item.title,
              item.url,
              userId,
              position,
              Date.now()
            ]
          );

          position++;
          inserted++;
        }

        return interaction.editReply(
          "✅ Import abgeschlossen.\n" +
          "Playlist: **" + playlist.name + "**\n" +
          "Importierte Einträge: **" + inserted + "**"
        );
      }

      if (subcommand === "remove") {
        const name = normalizeName(interaction.options.getString("playlist"));
        const position = interaction.options.getInteger("position");
        const scope = getScope(interaction);

        if (scope === "global" && !canManageGlobal(interaction)) {
          return interaction.editReply(
            "❌ Globale Playlists dürfen nur Mitglieder mit **Server verwalten** bearbeiten."
          );
        }

        const playlist = await findPlaylist(guildId, userId, scope, name);

        if (!playlist) {
          return interaction.editReply("❌ Playlist wurde nicht gefunden.");
        }

        const [result] = await db.execute(
          `DELETE FROM music_playlist_items
           WHERE playlistId = ?
             AND position = ?`,
          [playlist.id, position]
        );

        if (result.affectedRows === 0) {
          return interaction.editReply("❌ An dieser Position wurde kein Eintrag gefunden.");
        }

        await db.execute(
          `UPDATE music_playlist_items
           SET position = position - 1
           WHERE playlistId = ?
             AND position > ?`,
          [playlist.id, position]
        );

        return interaction.editReply(
          "✅ Eintrag **" + position + "** wurde aus **" + playlist.name + "** entfernt."
        );
      }

      if (subcommand === "delete") {
        const name = normalizeName(interaction.options.getString("playlist"));
        const scope = getScope(interaction);

        if (scope === "global" && !canManageGlobal(interaction)) {
          return interaction.editReply(
            "❌ Globale Playlists dürfen nur Mitglieder mit **Server verwalten** löschen."
          );
        }

        const playlist = await findPlaylist(guildId, userId, scope, name);

        if (!playlist) {
          return interaction.editReply("❌ Playlist wurde nicht gefunden.");
        }

        await db.execute(
          "DELETE FROM music_playlists WHERE id = ?",
          [playlist.id]
        );

        return interaction.editReply(
          "🗑 Playlist **" + playlist.name + "** wurde gelöscht."
        );
      }

      return interaction.editReply("❌ Unbekannter Playlist-Befehl.");
    } catch (err) {
      console.error("❌ Playlist Command Fehler:", err);

      return interaction.editReply(
        "❌ Fehler beim Ausführen des Playlist-Befehls."
      );
    }
  }
};

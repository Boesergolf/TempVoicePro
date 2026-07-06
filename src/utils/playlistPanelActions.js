const {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const db = require("../database/mysql");
const { getMetadataForUrl } = require("./musicMetadata");
const { importPlaylistFromUrl } = require("./musicImport");
const { addTracks } = require("./musicPlayer");
const { refreshLatestMusicPanel } = require("./musicPanelView");
const { createPlaylistPanelMessage } = require("./playlistPanel");

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function normalizeScope(scope) {
  const value = String(scope || "user").trim().toLowerCase();
  return value === "global" ? "global" : "user";
}

function getOwnerKey(scope, userId) {
  return scope === "global" ? "GLOBAL" : userId;
}

function canManageGlobal(interaction) {
  return interaction.memberPermissions &&
    interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
}

function detectSource(url) {
  const lower = String(url || "").toLowerCase();

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

function addTextInput(modal, customId, label, style, required, placeholder, value) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required);

  if (placeholder) {
    input.setPlaceholder(placeholder);
  }

  if (value) {
    input.setValue(value);
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );
}

function buildModal(customId, title) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title);
}

async function findPlaylist(guildId, userId, scope, name) {
  const ownerKey = getOwnerKey(scope, userId);

  const [rows] = await db.execute(
    `SELECT *
     FROM music_playlists
     WHERE guildId = ?
       AND ownerKey = ?
       AND scope = ?
       AND name = ?
     LIMIT 1`,
    [guildId, ownerKey, scope, name]
  );

  return rows[0] || null;
}

async function getOrCreatePlaylist(interaction, name, scope) {
  const existing = await findPlaylist(
    interaction.guild.id,
    interaction.user.id,
    scope,
    name
  );

  if (existing) {
    return {
      playlist: existing,
      created: false
    };
  }

  const ownerKey = getOwnerKey(scope, interaction.user.id);

  const [result] = await db.execute(
    `INSERT INTO music_playlists
       (guildId, ownerKey, scope, name, createdAt)
     VALUES (?, ?, ?, ?, NOW())`,
    [interaction.guild.id, ownerKey, scope, name]
  );

  return {
    playlist: {
      id: result.insertId,
      guildId: interaction.guild.id,
      ownerKey,
      scope,
      name
    },
    created: true
  };
}

async function getNextPosition(playlistId) {
  const [rows] = await db.execute(
    `SELECT COALESCE(MAX(position), 0) + 1 AS nextPosition
     FROM music_playlist_items
     WHERE playlistId = ?`,
    [playlistId]
  );

  return rows[0]?.nextPosition || 1;
}

async function insertPlaylistItem(playlistId, item) {
  const position = await getNextPosition(playlistId);

  await db.execute(
    `INSERT INTO music_playlist_items
       (playlistId, position, source, title, url, createdAt)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [
      playlistId,
      position,
      item.source || "url",
      item.title || item.url,
      item.url
    ]
  );

  return position;
}

async function showCreateModal(interaction) {
  const modal = buildModal("playlist_panel_create_modal", "Playlist erstellen");

  addTextInput(
    modal,
    "name",
    "Playlist-Name",
    TextInputStyle.Short,
    true,
    "z.B. Party, Farming, Chill",
    ""
  );

  addTextInput(
    modal,
    "scope",
    "Scope: user oder global",
    TextInputStyle.Short,
    false,
    "user",
    "user"
  );

  return interaction.showModal(modal);
}

async function showAddModal(interaction) {
  const modal = buildModal("playlist_panel_add_modal", "Song hinzufügen");

  addTextInput(modal, "playlist", "Playlist-Name", TextInputStyle.Short, true, "z.B. Party", "");
  addTextInput(modal, "url", "Song-Link", TextInputStyle.Paragraph, true, "YouTube, Spotify oder anderer Link", "");
  addTextInput(modal, "title", "Titel optional", TextInputStyle.Short, false, "leer lassen = automatisch", "");
  addTextInput(modal, "scope", "Scope: user oder global", TextInputStyle.Short, false, "user", "user");

  return interaction.showModal(modal);
}

async function showImportModal(interaction) {
  const modal = buildModal("playlist_panel_import_modal", "Playlist importieren");

  addTextInput(modal, "playlist", "Bot-Playlist-Name", TextInputStyle.Short, true, "z.B. Party", "");
  addTextInput(modal, "url", "Playlist-Link", TextInputStyle.Paragraph, true, "Spotify-Playlist oder YouTube-Playlist", "");
  addTextInput(modal, "limit", "Limit 1-100", TextInputStyle.Short, false, "50", "50");
  addTextInput(modal, "scope", "Scope: user oder global", TextInputStyle.Short, false, "user", "user");

  return interaction.showModal(modal);
}

async function showPlayModal(interaction) {
  const modal = buildModal("playlist_panel_play_modal", "Playlist abspielen");

  addTextInput(modal, "playlist", "Playlist-Name", TextInputStyle.Short, true, "z.B. Party", "");
  addTextInput(modal, "scope", "Scope: user oder global", TextInputStyle.Short, false, "user", "user");

  return interaction.showModal(modal);
}

async function showDeleteModal(interaction) {
  const modal = buildModal("playlist_panel_delete_modal", "Playlist löschen");

  addTextInput(modal, "playlist", "Playlist-Name", TextInputStyle.Short, true, "z.B. Party", "");
  addTextInput(modal, "scope", "Scope: user oder global", TextInputStyle.Short, false, "user", "user");
  addTextInput(modal, "confirm", "Zum Löschen JA eingeben", TextInputStyle.Short, true, "JA", "");

  return interaction.showModal(modal);
}

async function handleList(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const [rows] = await db.execute(
    `SELECT
       p.id,
       p.name,
       p.scope,
       p.ownerKey,
       COUNT(i.id) AS itemCount
     FROM music_playlists p
     LEFT JOIN music_playlist_items i ON i.playlistId = p.id
     WHERE p.guildId = ?
       AND (
         (p.scope = 'user' AND p.ownerKey = ?)
         OR p.scope = 'global'
       )
     GROUP BY p.id, p.name, p.scope, p.ownerKey
     ORDER BY p.scope ASC, p.name ASC
     LIMIT 50`,
    [interaction.guild.id, interaction.user.id]
  );

  if (rows.length === 0) {
    return interaction.editReply("📋 Noch keine Playlists vorhanden.");
  }

  const lines = rows.map(row => {
    const scopeLabel = row.scope === "global" ? "🌍 Global" : "👤 User";
    return scopeLabel + " — **" + row.name + "** — " + row.itemCount + " Einträge";
  });

  const embed = new EmbedBuilder()
    .setTitle("📋 Playlists")
    .setDescription(lines.join("\n"))
    .setColor(0x5865f2)
    .setFooter({ text: "Maximal 50 Playlists werden angezeigt." })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

async function handleRefresh(interaction) {
  await interaction.update(createPlaylistPanelMessage());
}

async function handleCreateModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const name = normalizeName(interaction.fields.getTextInputValue("name"));
  const scope = normalizeScope(interaction.fields.getTextInputValue("scope"));

  if (!name) {
    return interaction.editReply("❌ Bitte gib einen Playlist-Namen ein.");
  }

  if (scope === "global" && !canManageGlobal(interaction)) {
    return interaction.editReply("❌ Globale Playlists darfst du nur mit `Server verwalten` erstellen.");
  }

  const existing = await findPlaylist(interaction.guild.id, interaction.user.id, scope, name);

  if (existing) {
    return interaction.editReply("❌ Diese Playlist existiert bereits.");
  }

  await getOrCreatePlaylist(interaction, name, scope);

  return interaction.editReply(
    "✅ Playlist **" + name + "** wurde erstellt.\n" +
    "Scope: **" + scope + "**"
  );
}

async function handleAddModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const name = normalizeName(interaction.fields.getTextInputValue("playlist"));
  const url = String(interaction.fields.getTextInputValue("url") || "").trim();
  const customTitle = String(interaction.fields.getTextInputValue("title") || "").trim();
  const scope = normalizeScope(interaction.fields.getTextInputValue("scope"));

  if (!name) {
    return interaction.editReply("❌ Bitte gib einen Playlist-Namen ein.");
  }

  if (!validateUrl(url)) {
    return interaction.editReply("❌ Bitte gib einen gültigen Link ein.");
  }

  if (scope === "global" && !canManageGlobal(interaction)) {
    return interaction.editReply("❌ Globale Playlists darfst du nur mit `Server verwalten` bearbeiten.");
  }

  const result = await getOrCreatePlaylist(interaction, name, scope);

  const metadata = await getMetadataForUrl(url).catch(() => null);
  const title = customTitle || metadata?.displayTitle || metadata?.title || url;
  const source = detectSource(url);

  const position = await insertPlaylistItem(result.playlist.id, {
    source,
    title,
    url
  });

  return interaction.editReply(
    "✅ Song wurde zu **" + name + "** hinzugefügt.\n" +
    "Position: **" + position + "**\n" +
    "Titel: **" + title + "**" +
    (result.created ? "\n\nℹ️ Die Playlist wurde automatisch neu erstellt." : "")
  );
}

async function handleImportModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const name = normalizeName(interaction.fields.getTextInputValue("playlist"));
  const url = String(interaction.fields.getTextInputValue("url") || "").trim();
  const limitRaw = Number(interaction.fields.getTextInputValue("limit") || 50);
  const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 50, 100));
  const scope = normalizeScope(interaction.fields.getTextInputValue("scope"));

  if (!name) {
    return interaction.editReply("❌ Bitte gib einen Playlist-Namen ein.");
  }

  if (!validateUrl(url)) {
    return interaction.editReply("❌ Bitte gib einen gültigen Playlist-Link ein.");
  }

  if (scope === "global" && !canManageGlobal(interaction)) {
    return interaction.editReply("❌ Globale Playlists darfst du nur mit `Server verwalten` bearbeiten.");
  }

  const playlistResult = await getOrCreatePlaylist(interaction, name, scope);

  let imported;
  try {
    imported = await importPlaylistFromUrl(url, limit);
  } catch (error) {
    if (error && error.isUserFacing) {
      return interaction.editReply("❌ " + error.message);
    }

    console.error("Playlist Panel Import Fehler:", error);
    return interaction.editReply("❌ Import fehlgeschlagen. Details stehen im Bot-Log.");
  }

  const items = Array.isArray(imported)
    ? imported
    : imported?.items || imported?.tracks || [];

  if (items.length === 0) {
    return interaction.editReply("❌ Es wurden keine importierbaren Einträge gefunden.");
  }

  let count = 0;

  for (const item of items.slice(0, limit)) {
    const itemUrl = item.url || item.originalUrl;

    if (!itemUrl) {
      continue;
    }

    await insertPlaylistItem(playlistResult.playlist.id, {
      source: item.source || detectSource(itemUrl),
      title: item.title || item.displayTitle || itemUrl,
      url: itemUrl
    });

    count++;
  }

  return interaction.editReply(
    "✅ Import abgeschlossen.\n" +
    "Playlist: **" + name + "**\n" +
    "Importiert: **" + count + "** Einträge" +
    (playlistResult.created ? "\n\nℹ️ Die Playlist wurde automatisch neu erstellt." : "")
  );
}

async function handlePlayModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const name = normalizeName(interaction.fields.getTextInputValue("playlist"));
  const scope = normalizeScope(interaction.fields.getTextInputValue("scope"));

  if (!name) {
    return interaction.editReply("❌ Bitte gib einen Playlist-Namen ein.");
  }

  const playlist = await findPlaylist(interaction.guild.id, interaction.user.id, scope, name);

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  const [items] = await db.execute(
    `SELECT *
     FROM music_playlist_items
     WHERE playlistId = ?
     ORDER BY position ASC
     LIMIT 100`,
    [playlist.id]
  );

  if (items.length === 0) {
    return interaction.editReply("❌ Diese Playlist ist leer.");
  }

  const tracks = items.map(item => {
    if (item.source === "spotify") {
      return {
        source: "search",
        query: item.title || item.url,
        title: item.title || item.url,
        originalSource: "spotify",
        originalUrl: item.url
      };
    }

    return {
      source: item.source || "url",
      url: item.url,
      title: item.title || item.url
    };
  });

  await addTracks(interaction, tracks);
  await refreshLatestMusicPanel(interaction).catch(() => null);

  return interaction.editReply(
    "▶ Playlist **" + playlist.name + "** wurde zur Queue hinzugefügt.\n" +
    "Einträge: **" + tracks.length + "**"
  );
}

async function handleDeleteModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const name = normalizeName(interaction.fields.getTextInputValue("playlist"));
  const scope = normalizeScope(interaction.fields.getTextInputValue("scope"));
  const confirm = String(interaction.fields.getTextInputValue("confirm") || "").trim().toUpperCase();

  if (confirm !== "JA") {
    return interaction.editReply("❌ Löschen abgebrochen. Du musst `JA` eingeben.");
  }

  if (scope === "global" && !canManageGlobal(interaction)) {
    return interaction.editReply("❌ Globale Playlists darfst du nur mit `Server verwalten` löschen.");
  }

  const playlist = await findPlaylist(interaction.guild.id, interaction.user.id, scope, name);

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  await db.execute(
    "DELETE FROM music_playlist_items WHERE playlistId = ?",
    [playlist.id]
  );

  await db.execute(
    "DELETE FROM music_playlists WHERE id = ?",
    [playlist.id]
  );

  return interaction.editReply("🧹 Playlist **" + name + "** wurde gelöscht.");
}

async function handlePlaylistPanelModal(interaction) {
  if (interaction.customId === "playlist_panel_create_modal") {
    return handleCreateModal(interaction);
  }

  if (interaction.customId === "playlist_panel_add_modal") {
    return handleAddModal(interaction);
  }

  if (interaction.customId === "playlist_panel_import_modal") {
    return handleImportModal(interaction);
  }

  if (interaction.customId === "playlist_panel_play_modal") {
    return handlePlayModal(interaction);
  }

  if (interaction.customId === "playlist_panel_delete_modal") {
    return handleDeleteModal(interaction);
  }

  return null;
}

module.exports = {
  showCreateModal,
  showAddModal,
  showImportModal,
  showPlayModal,
  showDeleteModal,
  handleList,
  handleRefresh,
  handlePlaylistPanelModal
};

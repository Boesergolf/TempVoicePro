const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const {
  scheduleEphemeralReplyDelete
} = require("./temporaryInteractionReply");

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

  modal.addComponents(new ActionRowBuilder().addComponents(input));
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

async function getPlaylistById(interaction, playlistId) {
  const [rows] = await db.execute(
    `SELECT *
     FROM music_playlists
     WHERE id = ?
       AND guildId = ?
     LIMIT 1`,
    [playlistId, interaction.guild.id]
  );

  const playlist = rows[0];

  if (!playlist) {
    return null;
  }

  if (playlist.scope === "global") {
    return playlist;
  }

  if (playlist.ownerKey === interaction.user.id) {
    return playlist;
  }

  return null;
}

function canManagePlaylist(interaction, playlist) {
  if (!playlist) {
    return false;
  }

  if (playlist.scope === "global") {
    return canManageGlobal(interaction);
  }

  return playlist.ownerKey === interaction.user.id;
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
       (playlistId, position, source, title, url, addedBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      playlistId,
      position,
      item.source || "url",
      item.title || item.url,
      item.url,
      item.addedBy || item.addedById || "system"
    ]
  );

  return position;
}

async function getPlaylistItems(playlistId, limit = 100) {
  const [items] = await db.execute(
    `SELECT *
     FROM music_playlist_items
     WHERE playlistId = ?
     ORDER BY position ASC
     LIMIT ?`,
    [playlistId, limit]
  );

  return items;
}

async function compactPlaylistPositions(playlistId) {
  const [items] = await db.execute(
    `SELECT id
     FROM music_playlist_items
     WHERE playlistId = ?
     ORDER BY position ASC, id ASC`,
    [playlistId]
  );

  let position = 1;

  for (const item of items) {
    await db.execute(
      "UPDATE music_playlist_items SET position = ? WHERE id = ?",
      [position, item.id]
    );

    position++;
  }
}

async function getAccessiblePlaylists(interaction) {
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
     LIMIT 25`,
    [interaction.guild.id, interaction.user.id]
  );

  return rows;
}

function createSelectedPlaylistRows(playlistId, playlist) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("playlist_selected_show:" + playlistId)
      .setLabel("Songs anzeigen")
      .setEmoji("🧾")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("playlist_selected_play:" + playlistId)
      .setLabel("Abspielen")
      .setEmoji("▶")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("playlist_selected_add:" + playlistId)
      .setLabel("Song hinzufügen")
      .setEmoji("📥")
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("playlist_selected_import:" + playlistId)
      .setLabel("Importieren")
      .setEmoji("🔁")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("playlist_selected_remove:" + playlistId)
      .setLabel("Song entfernen")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("playlist_selected_delete:" + playlistId)
      .setLabel("Playlist löschen")
      .setEmoji("🧹")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(playlist.scope === "global" ? false : false)
  );

  return [row1, row2];
}

async function showPlaylistSelect(interaction) {
  await interaction.deferReply({ flags: 64 });

  const playlists = await getAccessiblePlaylists(interaction);

  if (playlists.length === 0) {
    return interaction.editReply(
      "📭 Noch keine Playlists vorhanden.\n\n" +
      "Nutze **➕ Playlist erstellen** oder **📥 Song hinzufügen**, um eine Playlist anzulegen."
    );
  }

  const options = playlists.map(row => {
    const scopeIcon = row.scope === "global" ? "🌍" : "👤";
    const label = (scopeIcon + " " + row.name).slice(0, 100);
    const description = (row.scope + " • " + row.itemCount + " Einträge").slice(0, 100);

    return {
      label,
      description,
      value: String(row.id)
    };
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId("playlist_panel_select")
    .setPlaceholder("Playlist auswählen...")
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  return interaction.editReply({
    content: "🎚️ Wähle eine Playlist aus:",
    components: [row]
  });
}

async function handlePlaylistPanelSelect(interaction) {
  const playlistId = Number(interaction.values[0]);
  const playlist = await getPlaylistById(interaction, playlistId);

  if (!playlist) {
    return interaction.update({
      content: "❌ Diese Playlist wurde nicht gefunden oder gehört dir nicht.",
      embeds: [],
      components: []
    });
  }

  const items = await getPlaylistItems(playlist.id, 5);

  const preview = items.length
    ? items.map(item => "**" + item.position + ".** " + (item.title || item.url)).join("\n")
    : "📭 Diese Playlist ist leer.";

  const embed = new EmbedBuilder()
    .setTitle("🎚️ Playlist ausgewählt: " + playlist.name)
    .setDescription(preview)
    .setColor(0x5865f2)
    .addFields(
      {
        name: "Scope",
        value: playlist.scope === "global" ? "🌍 Global" : "👤 User",
        inline: true
      },
      {
        name: "Playlist-ID",
        value: String(playlist.id),
        inline: true
      }
    )
    .setFooter({ text: "Die Auswahl ist nur für dich sichtbar." })
    .setTimestamp();

  return interaction.update({
    content: "",
    embeds: [embed],
    components: createSelectedPlaylistRows(playlist.id, playlist)
  });
}

async function showCreateModal(interaction) {
  const modal = buildModal("playlist_panel_create_modal", "Playlist erstellen");

  addTextInput(modal, "name", "Playlist-Name", TextInputStyle.Short, true, "z.B. Party, Farming, Chill", "");
  addTextInput(modal, "scope", "Scope: user oder global", TextInputStyle.Short, false, "user", "user");

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

async function showShowModal(interaction) {
  const modal = buildModal("playlist_panel_show_modal", "Songs anzeigen");

  addTextInput(modal, "playlist", "Playlist-Name", TextInputStyle.Short, true, "z.B. Party", "");
  addTextInput(modal, "scope", "Scope: user oder global", TextInputStyle.Short, false, "user", "user");

  return interaction.showModal(modal);
}

async function showRemoveModal(interaction) {
  const modal = buildModal("playlist_panel_remove_modal", "Song entfernen");

  addTextInput(modal, "playlist", "Playlist-Name", TextInputStyle.Short, true, "z.B. Party", "");
  addTextInput(modal, "position", "Position des Songs", TextInputStyle.Short, true, "z.B. 3", "");
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

async function showAddSelectedModal(interaction, playlistId) {
  const playlist = await getPlaylistById(interaction, playlistId);

  if (!playlist) {
    return interaction.reply({
      content: "❌ Playlist wurde nicht gefunden.",
      flags: 64
    });
  }

  if (!canManagePlaylist(interaction, playlist)) {
    return interaction.reply({
      content: "❌ Diese Playlist darfst du nicht bearbeiten.",
      flags: 64
    });
  }

  const modal = buildModal("playlist_panel_add_selected_modal:" + playlistId, "Song hinzufügen");

  addTextInput(modal, "url", "Song-Link", TextInputStyle.Paragraph, true, "YouTube, Spotify oder anderer Link", "");
  addTextInput(modal, "title", "Titel optional", TextInputStyle.Short, false, "leer lassen = automatisch", "");

  return interaction.showModal(modal);
}

async function showImportSelectedModal(interaction, playlistId) {
  const playlist = await getPlaylistById(interaction, playlistId);

  if (!playlist) {
    return interaction.reply({
      content: "❌ Playlist wurde nicht gefunden.",
      flags: 64
    });
  }

  if (!canManagePlaylist(interaction, playlist)) {
    return interaction.reply({
      content: "❌ Diese Playlist darfst du nicht bearbeiten.",
      flags: 64
    });
  }

  const modal = buildModal("playlist_panel_import_selected_modal:" + playlistId, "Playlist importieren");

  addTextInput(modal, "url", "Playlist-Link", TextInputStyle.Paragraph, true, "Spotify-Playlist oder YouTube-Playlist", "");
  addTextInput(modal, "limit", "Limit 1-100", TextInputStyle.Short, false, "50", "50");

  return interaction.showModal(modal);
}

async function showRemoveSelectedModal(interaction, playlistId) {
  const playlist = await getPlaylistById(interaction, playlistId);

  if (!playlist) {
    return interaction.reply({
      content: "❌ Playlist wurde nicht gefunden.",
      flags: 64
    });
  }

  if (!canManagePlaylist(interaction, playlist)) {
    return interaction.reply({
      content: "❌ Diese Playlist darfst du nicht bearbeiten.",
      flags: 64
    });
  }

  const modal = buildModal("playlist_panel_remove_selected_modal:" + playlistId, "Song entfernen");

  addTextInput(modal, "position", "Position des Songs", TextInputStyle.Short, true, "z.B. 3", "");

  return interaction.showModal(modal);
}

async function showDeleteSelectedModal(interaction, playlistId) {
  const playlist = await getPlaylistById(interaction, playlistId);

  if (!playlist) {
    return interaction.reply({
      content: "❌ Playlist wurde nicht gefunden.",
      flags: 64
    });
  }

  if (!canManagePlaylist(interaction, playlist)) {
    return interaction.reply({
      content: "❌ Diese Playlist darfst du nicht löschen.",
      flags: 64
    });
  }

  const modal = buildModal("playlist_panel_delete_selected_modal:" + playlistId, "Playlist löschen");

  addTextInput(modal, "confirm", "Zum Löschen JA eingeben", TextInputStyle.Short, true, "JA", "");

  return interaction.showModal(modal);
}

async function handleList(interaction) {
  await interaction.deferReply({ flags: 64 });

  const rows = await getAccessiblePlaylists(interaction);

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
    .setFooter({ text: "Maximal 25 Playlists werden angezeigt." })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

async function handleRefresh(interaction) {
  return interaction.update(createPlaylistPanelMessage());
}

async function handleCreateModal(interaction) {
  await interaction.deferReply({ flags: 64 });

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


function isSupportedPlaylistImportUrl(url) {
  const lower = String(url || "").toLowerCase();

  return (
    lower.includes("spotify.com/playlist") ||
    lower.startsWith("spotify:playlist:") ||
    (
      (
        lower.includes("youtube.com") ||
        lower.includes("youtu.be") ||
        lower.includes("music.youtube.com")
      ) &&
      lower.includes("list=")
    )
  );
}

function getAddModalImportLimit() {
  const value = Number(process.env.PLAYLIST_PANEL_ADD_IMPORT_LIMIT || 50);

  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.max(1, Math.min(value, 100));
}

async function addUrlToPlaylist(interaction, playlist, url, customTitle) {
  const rawUrl = String(url || "").trim();

  if (!validateUrl(rawUrl) && !rawUrl.toLowerCase().startsWith("spotify:playlist:")) {
    return {
      ok: false,
      message: "❌ Bitte gib einen gültigen Link ein."
    };
  }

  if (isSupportedPlaylistImportUrl(rawUrl)) {
    const limit = getAddModalImportLimit();
    const imported = await importIntoPlaylist(interaction, playlist, rawUrl, limit);

    if (!imported.ok) {
      return imported;
    }

    return {
      ok: true,
      imported: true,
      count: imported.count || 0,
      title: "Playlist-Import",
      position: null,
      message:
        "✅ Playlist wurde in **" + playlist.name + "** importiert.\n" +
        "Importiert: **" + (imported.count || 0) + "** Song(s)."
    };
  }

  const metadata = await getMetadataForUrl(rawUrl).catch(() => null);
  const title = customTitle || metadata?.displayTitle || metadata?.title || rawUrl;
  const source = detectSource(rawUrl);

  const position = await insertPlaylistItem(playlist.id, {
    source,
    title,
    url: rawUrl,
    addedBy: interaction.user.id
  });

  return {
    ok: true,
    title,
    position
  };
}

async function handleAddModal(interaction) {
  await interaction.deferReply({ flags: 64 });

  const name = normalizeName(interaction.fields.getTextInputValue("playlist"));
  const url = String(interaction.fields.getTextInputValue("url") || "").trim();
  const customTitle = String(interaction.fields.getTextInputValue("title") || "").trim();
  const scope = normalizeScope(interaction.fields.getTextInputValue("scope"));

  if (!name) {
    return interaction.editReply("❌ Bitte gib einen Playlist-Namen ein.");
  }

  if (scope === "global" && !canManageGlobal(interaction)) {
    return interaction.editReply("❌ Globale Playlists darfst du nur mit `Server verwalten` bearbeiten.");
  }

  const result = await getOrCreatePlaylist(interaction, name, scope);
  const added = await addUrlToPlaylist(interaction, result.playlist, url, customTitle);

  if (!added.ok) {
    return interaction.editReply(added.message);
  }

  if (added.imported) {
    return interaction.editReply(
      added.message +
      (result.created ? "\n\nℹ️ Die Playlist wurde automatisch neu erstellt." : "")
    );
  }

  return interaction.editReply(
    "✅ Song wurde zu **" + name + "** hinzugefügt.\n" +
    "Position: **" + added.position + "**\n" +
    "Titel: **" + added.title + "**" +
    (result.created ? "\n\nℹ️ Die Playlist wurde automatisch neu erstellt." : "")
  );
}

async function handleAddSelectedModal(interaction, playlistId) {
  await interaction.deferReply({ flags: 64 });

  const playlist = await getPlaylistById(interaction, playlistId);

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  if (!canManagePlaylist(interaction, playlist)) {
    return interaction.editReply("❌ Diese Playlist darfst du nicht bearbeiten.");
  }

  const url = String(interaction.fields.getTextInputValue("url") || "").trim();
  const customTitle = String(interaction.fields.getTextInputValue("title") || "").trim();

  const added = await addUrlToPlaylist(interaction, playlist, url, customTitle);

  if (!added.ok) {
    return interaction.editReply(added.message);
  }

  if (added.imported) {
    return interaction.editReply(added.message);
  }

  return interaction.editReply(
    "✅ Song wurde zu **" + playlist.name + "** hinzugefügt.\n" +
    "Position: **" + added.position + "**\n" +
    "Titel: **" + added.title + "**"
  );
}

async function importIntoPlaylist(interaction, playlist, url, limit) {
  if (!validateUrl(url)) {
    return {
      ok: false,
      message: "❌ Bitte gib einen gültigen Playlist-Link ein."
    };
  }

  let imported;

  try {
    imported = await importPlaylistFromUrl(url, limit);
  } catch (error) {
    if (error && error.isUserFacing) {
      return {
        ok: false,
        message: "❌ " + error.message
      };
    }

    console.error("Playlist Panel Import Fehler:", error);

    return {
      ok: false,
      message: "❌ Import fehlgeschlagen. Details stehen im Bot-Log."
    };
  }

  const items = Array.isArray(imported)
    ? imported
    : imported?.items || imported?.tracks || [];

  if (items.length === 0) {
    return {
      ok: false,
      message: "❌ Es wurden keine importierbaren Einträge gefunden."
    };
  }

  let count = 0;

  for (const item of items.slice(0, limit)) {
    const itemUrl = item.url || item.originalUrl;

    if (!itemUrl) {
      continue;
    }

    await insertPlaylistItem(playlist.id, {
      source: item.source || detectSource(itemUrl),
      title: item.title || item.displayTitle || itemUrl,
      url: itemUrl
    });

    count++;
  }

  return {
    ok: true,
    count
  };
}

async function handleImportModal(interaction) {
  await interaction.deferReply({ flags: 64 });

  const name = normalizeName(interaction.fields.getTextInputValue("playlist"));
  const url = String(interaction.fields.getTextInputValue("url") || "").trim();
  const limitRaw = Number(interaction.fields.getTextInputValue("limit") || 50);
  const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 50, 100));
  const scope = normalizeScope(interaction.fields.getTextInputValue("scope"));

  if (!name) {
    return interaction.editReply("❌ Bitte gib einen Playlist-Namen ein.");
  }

  if (scope === "global" && !canManageGlobal(interaction)) {
    return interaction.editReply("❌ Globale Playlists darfst du nur mit `Server verwalten` bearbeiten.");
  }

  const playlistResult = await getOrCreatePlaylist(interaction, name, scope);
  const result = await importIntoPlaylist(interaction, playlistResult.playlist, url, limit);

  if (!result.ok) {
    return interaction.editReply(result.message);
  }

  return interaction.editReply(
    "✅ Import abgeschlossen.\n" +
    "Playlist: **" + name + "**\n" +
    "Importiert: **" + result.count + "** Einträge" +
    (playlistResult.created ? "\n\nℹ️ Die Playlist wurde automatisch neu erstellt." : "")
  );
}

async function handleImportSelectedModal(interaction, playlistId) {
  await interaction.deferReply({ flags: 64 });

  const playlist = await getPlaylistById(interaction, playlistId);

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  if (!canManagePlaylist(interaction, playlist)) {
    return interaction.editReply("❌ Diese Playlist darfst du nicht bearbeiten.");
  }

  const url = String(interaction.fields.getTextInputValue("url") || "").trim();
  const limitRaw = Number(interaction.fields.getTextInputValue("limit") || 50);
  const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 50, 100));

  const result = await importIntoPlaylist(interaction, playlist, url, limit);

  if (!result.ok) {
    return interaction.editReply(result.message);
  }

  return interaction.editReply(
    "✅ Import abgeschlossen.\n" +
    "Playlist: **" + playlist.name + "**\n" +
    "Importiert: **" + result.count + "** Einträge"
  );
}

async function playPlaylist(interaction, playlist) {
  const items = await getPlaylistItems(playlist.id, 100);

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

async function handlePlayModal(interaction) {
  await interaction.deferReply({ flags: 64 });

  const name = normalizeName(interaction.fields.getTextInputValue("playlist"));
  const scope = normalizeScope(interaction.fields.getTextInputValue("scope"));

  if (!name) {
    return interaction.editReply("❌ Bitte gib einen Playlist-Namen ein.");
  }

  const playlist = await findPlaylist(interaction.guild.id, interaction.user.id, scope, name);

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  return playPlaylist(interaction, playlist);
}

async function handlePlaySelected(interaction, playlistId) {
  await interaction.deferReply({ flags: 64 });

  const playlist = await getPlaylistById(interaction, playlistId);

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  return playPlaylist(interaction, playlist);
}

async function showPlaylistSongs(interaction, playlist) {
  const items = await getPlaylistItems(playlist.id, 50);

  if (items.length === 0) {
    return interaction.editReply("📭 Diese Playlist ist leer.");
  }

  const lines = items.map(item => {
    const title = item.title || item.url;
    return "**" + item.position + ".** " + title;
  });

  const embed = new EmbedBuilder()
    .setTitle("🧾 Songs in " + playlist.name)
    .setDescription(lines.join("\n").slice(0, 4000))
    .setColor(0x5865f2)
    .setFooter({ text: "Scope: " + playlist.scope + " • Maximal 50 Einträge" })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

async function handleShowModal(interaction) {
  await interaction.deferReply({ flags: 64 });

  const name = normalizeName(interaction.fields.getTextInputValue("playlist"));
  const scope = normalizeScope(interaction.fields.getTextInputValue("scope"));

  if (!name) {
    return interaction.editReply("❌ Bitte gib einen Playlist-Namen ein.");
  }

  const playlist = await findPlaylist(interaction.guild.id, interaction.user.id, scope, name);

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  return showPlaylistSongs(interaction, playlist);
}

async function handleShowSelected(interaction, playlistId) {
  await interaction.deferReply({ flags: 64 });

  const playlist = await getPlaylistById(interaction, playlistId);

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  return showPlaylistSongs(interaction, playlist);
}

async function removePlaylistPosition(interaction, playlist, position) {
  const [items] = await db.execute(
    `SELECT *
     FROM music_playlist_items
     WHERE playlistId = ?
       AND position = ?
     LIMIT 1`,
    [playlist.id, position]
  );

  const item = items[0];

  if (!item) {
    return interaction.editReply("❌ An dieser Position wurde kein Song gefunden.");
  }

  await db.execute(
    "DELETE FROM music_playlist_items WHERE id = ?",
    [item.id]
  );

  await compactPlaylistPositions(playlist.id);

  return interaction.editReply(
    "✅ Song wurde entfernt.\n" +
    "Playlist: **" + playlist.name + "**\n" +
    "Entfernt: **" + (item.title || item.url) + "**"
  );
}

async function handleRemoveModal(interaction) {
  await interaction.deferReply({ flags: 64 });

  const name = normalizeName(interaction.fields.getTextInputValue("playlist"));
  const positionRaw = Number(interaction.fields.getTextInputValue("position"));
  const position = Number.isFinite(positionRaw) ? Math.floor(positionRaw) : 0;
  const scope = normalizeScope(interaction.fields.getTextInputValue("scope"));

  if (!name) {
    return interaction.editReply("❌ Bitte gib einen Playlist-Namen ein.");
  }

  if (position < 1) {
    return interaction.editReply("❌ Bitte gib eine gültige Position an.");
  }

  if (scope === "global" && !canManageGlobal(interaction)) {
    return interaction.editReply("❌ Globale Playlists darfst du nur mit `Server verwalten` bearbeiten.");
  }

  const playlist = await findPlaylist(interaction.guild.id, interaction.user.id, scope, name);

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  return removePlaylistPosition(interaction, playlist, position);
}

async function handleRemoveSelectedModal(interaction, playlistId) {
  await interaction.deferReply({ flags: 64 });

  const playlist = await getPlaylistById(interaction, playlistId);

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  if (!canManagePlaylist(interaction, playlist)) {
    return interaction.editReply("❌ Diese Playlist darfst du nicht bearbeiten.");
  }

  const positionRaw = Number(interaction.fields.getTextInputValue("position"));
  const position = Number.isFinite(positionRaw) ? Math.floor(positionRaw) : 0;

  if (position < 1) {
    return interaction.editReply("❌ Bitte gib eine gültige Position an.");
  }

  return removePlaylistPosition(interaction, playlist, position);
}

async function deletePlaylist(interaction, playlist) {
  await db.execute(
    "DELETE FROM music_playlist_items WHERE playlistId = ?",
    [playlist.id]
  );

  await db.execute(
    "DELETE FROM music_playlists WHERE id = ?",
    [playlist.id]
  );

  return interaction.editReply("🧹 Playlist **" + playlist.name + "** wurde gelöscht.");
}

async function handleDeleteModal(interaction) {
  await interaction.deferReply({ flags: 64 });

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

  return deletePlaylist(interaction, playlist);
}

async function handleDeleteSelectedModal(interaction, playlistId) {
  await interaction.deferReply({ flags: 64 });

  const playlist = await getPlaylistById(interaction, playlistId);

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  if (!canManagePlaylist(interaction, playlist)) {
    return interaction.editReply("❌ Diese Playlist darfst du nicht löschen.");
  }

  const confirm = String(interaction.fields.getTextInputValue("confirm") || "").trim().toUpperCase();

  if (confirm !== "JA") {
    return interaction.editReply("❌ Löschen abgebrochen. Du musst `JA` eingeben.");
  }

  return deletePlaylist(interaction, playlist);
}

async function handlePlaylistSelectedButton(interaction) {
  const [action, idRaw] = interaction.customId.replace("playlist_selected_", "").split(":");
  const playlistId = Number(idRaw);

  if (!Number.isFinite(playlistId)) {
    return interaction.reply({
      content: "❌ Ungültige Playlist-Auswahl.",
      flags: 64
    });
  }

  if (action === "show") {
    return handleShowSelected(interaction, playlistId);
  }

  if (action === "play") {
    return handlePlaySelected(interaction, playlistId);
  }

  if (action === "add") {
    return showAddSelectedModal(interaction, playlistId);
  }

  if (action === "import") {
    return showImportSelectedModal(interaction, playlistId);
  }

  if (action === "remove") {
    return showRemoveSelectedModal(interaction, playlistId);
  }

  if (action === "delete") {
    return showDeleteSelectedModal(interaction, playlistId);
  }

  return interaction.reply({
    content: "❌ Unbekannte Playlist-Aktion.",
    flags: 64
  });
}

async function dispatchPlaylistPanelModal(interaction) {
  if (interaction.customId === "playlist_panel_create_modal") {
    return handleCreateModal(interaction);
  }

  if (interaction.customId === "playlist_panel_add_modal") {
    return handleAddModal(interaction);
  }

  if (interaction.customId.startsWith("playlist_panel_add_selected_modal:")) {
    return handleAddSelectedModal(interaction, Number(interaction.customId.split(":")[1]));
  }

  if (interaction.customId === "playlist_panel_import_modal") {
    return handleImportModal(interaction);
  }

  if (interaction.customId.startsWith("playlist_panel_import_selected_modal:")) {
    return handleImportSelectedModal(interaction, Number(interaction.customId.split(":")[1]));
  }

  if (interaction.customId === "playlist_panel_play_modal") {
    return handlePlayModal(interaction);
  }

  if (interaction.customId === "playlist_panel_show_modal") {
    return handleShowModal(interaction);
  }

  if (interaction.customId === "playlist_panel_remove_modal") {
    return handleRemoveModal(interaction);
  }

  if (interaction.customId.startsWith("playlist_panel_remove_selected_modal:")) {
    return handleRemoveSelectedModal(interaction, Number(interaction.customId.split(":")[1]));
  }

  if (interaction.customId === "playlist_panel_delete_modal") {
    return handleDeleteModal(interaction);
  }

  if (interaction.customId.startsWith("playlist_panel_delete_selected_modal:")) {
    return handleDeleteSelectedModal(interaction, Number(interaction.customId.split(":")[1]));
  }

  return null;
}

async function handlePlaylistPanelModal(interaction) {
  try {
    return await dispatchPlaylistPanelModal(interaction);
  } finally {
    scheduleEphemeralReplyDelete(interaction);
  }
}

async function handleListTemporary(interaction) {
  try {
    return await handleList(interaction);
  } finally {
    scheduleEphemeralReplyDelete(interaction);
  }
}

async function handlePlaylistSelectedButtonTemporary(interaction) {
  try {
    return await handlePlaylistSelectedButton(interaction);
  } finally {
    scheduleEphemeralReplyDelete(interaction);
  }
}


module.exports = {
  showPlaylistSelect,
  handlePlaylistPanelSelect,
  handlePlaylistSelectedButton: handlePlaylistSelectedButtonTemporary,

  showCreateModal,
  showAddModal,
  showImportModal,
  showPlayModal,
  showShowModal,
  showRemoveModal,
  showDeleteModal,

  handleList: handleListTemporary,
  handleRefresh,
  handlePlaylistPanelModal
};

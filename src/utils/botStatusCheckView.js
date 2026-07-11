const {
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const { execFile } = require("child_process");

const db = require("../database/mysql");
const { PANEL_CHANNEL_NAME } = require("./panelChannel");
const {
  UI_COLORS,
  UI_FOOTERS,
  statusLine
} = require("./ui");

const TEMPVOICE_PANEL_CHANNEL_NAME =
  process.env.TEMPVOICE_PANEL_CHANNEL_NAME || "tempvoice-panels";

const IMPORTANT_TABLES = [
  "guild_settings",
  "temp_channels",
  "temp_permissions",
  "music_playlists",
  "music_playlist_items",
  "music_settings",
  "spotify_user_tokens",
  "guild_modules"
];

function ok(text) {
  return statusLine("ok", text);
}

function warn(text) {
  return statusLine("warn", text);
}

function fail(text) {
  return statusLine("fail", text);
}

function envStatus(name) {
  return process.env[name] ? ok(name + ": gesetzt") : fail(name + ": fehlt");
}

function isHttps(value) {
  return typeof value === "string" && value.startsWith("https://");
}

function limitValue(lines) {
  const text = lines.filter(Boolean).join("\n");

  if (text.length <= 1024) {
    return text || "Keine Daten.";
  }

  return text.slice(0, 1000) + "\n...";
}

function escapeIdentifier(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error("Ungültiger SQL-Identifier: " + name);
  }

  return "`" + name + "`";
}

async function safeStep(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("❌ Botstatus Fehler in " + label + ":", err.message);
    return {
      lines: [fail(label + ": Fehler beim Prüfen")]
    };
  }
}

async function tableExists(tableName) {
  const [rows] = await db.execute(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName]
  );

  return rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await db.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );

  return rows.length > 0;
}

async function countRows(tableName, whereSql = "", params = []) {
  const [rows] = await db.execute(
    "SELECT COUNT(*) AS count FROM " + escapeIdentifier(tableName) + " " + whereSql,
    params
  );

  return Number(rows[0]?.count || 0);
}

function findTextChannel(guild, name) {
  return guild.channels.cache.find(channel =>
    channel &&
    channel.type === ChannelType.GuildText &&
    channel.name === name
  );
}

function checkYtDlp() {
  return new Promise(resolve => {
    const binary = process.env.YTDLP_PATH || "yt-dlp";

    execFile(binary, ["--version"], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve(warn("yt-dlp: nicht verfügbar oder nicht ausführbar"));
        return;
      }

      const version = String(stdout || "").trim();
      resolve(ok("yt-dlp: verfügbar" + (version ? " (" + version + ")" : "")));
    });
  });
}

async function buildTempVoiceLines(guild) {
  const lines = [];
  const hasGuildSettings = await tableExists("guild_settings");
  const hasTempChannels = await tableExists("temp_channels");

  lines.push(hasGuildSettings ? ok("guild_settings vorhanden") : fail("guild_settings fehlt"));

  let settings = null;

  if (hasGuildSettings) {
    const [rows] = await db.execute(
      "SELECT creatorChannelId, categoryId FROM guild_settings WHERE guildId = ? LIMIT 1",
      [guild.id]
    );

    settings = rows[0] || null;
    lines.push(settings ? ok("Setup-Daten vorhanden") : warn("Setup-Daten fehlen"));
  }

  if (settings) {
    const creator = settings.creatorChannelId
      ? guild.channels.cache.get(settings.creatorChannelId)
      : null;
    const category = settings.categoryId
      ? guild.channels.cache.get(settings.categoryId)
      : null;

    lines.push(creator ? ok("Creator-Channel gefunden") : warn("Creator-Channel fehlt"));
    lines.push(category ? ok("Kategorie gefunden") : warn("Kategorie fehlt"));
  } else {
    lines.push(warn("Creator-Channel nicht prüfbar"));
    lines.push(warn("Kategorie nicht prüfbar"));
  }

  const tempVoicePanelChannel = findTextChannel(guild, TEMPVOICE_PANEL_CHANNEL_NAME);
  lines.push(
    tempVoicePanelChannel
      ? ok("#" + TEMPVOICE_PANEL_CHANNEL_NAME + " gefunden")
      : warn("#" + TEMPVOICE_PANEL_CHANNEL_NAME + " fehlt")
  );

  if (hasTempChannels) {
    const count = await countRows("temp_channels", "WHERE guildId = ?", [guild.id]);
    lines.push(ok("Temp-Channels: " + count));

    const hasPermanentColumn = await columnExists("temp_channels", "isPermanent");

    if (hasPermanentColumn) {
      const permanentCount = await countRows(
        "temp_channels",
        "WHERE guildId = ? AND isPermanent = 1",
        [guild.id]
      );
      lines.push(ok("Permanent: " + permanentCount));
    } else {
      lines.push(warn("Spalte isPermanent fehlt"));
    }
  } else {
    lines.push(fail("temp_channels fehlt"));
  }

  return { lines };
}

async function buildMusicLines(guild) {
  const lines = [];
  const hasPlaylists = await tableExists("music_playlists");
  const hasItems = await tableExists("music_playlist_items");
  const hasSettings = await tableExists("music_settings");

  lines.push(hasPlaylists ? ok("music_playlists vorhanden") : fail("music_playlists fehlt"));
  lines.push(hasItems ? ok("music_playlist_items vorhanden") : fail("music_playlist_items fehlt"));
  lines.push(hasSettings ? ok("music_settings vorhanden") : warn("music_settings fehlt"));

  if (hasPlaylists) {
    const playlistCount = await countRows("music_playlists", "WHERE guildId = ?", [guild.id]);
    lines.push(ok("Server-Playlists: " + playlistCount));
  }

  if (hasPlaylists && hasItems) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS count
       FROM music_playlist_items mpi
       INNER JOIN music_playlists mp ON mp.id = mpi.playlistId
       WHERE mp.guildId = ?`,
      [guild.id]
    );
    lines.push(ok("Playlist-Items: " + Number(rows[0]?.count || 0)));
  } else {
    lines.push(warn("Playlist-Items nicht zählbar"));
  }

  lines.push(await checkYtDlp());
  lines.push(envStatus("YOUTUBE_API_KEY"));
  lines.push(envStatus("YTDLP_PATH"));
  lines.push(envStatus("YTDLP_PLAYER_CLIENTS"));
  lines.push(
    "MUSIC_PUBLIC_MESSAGES: " +
      (process.env.MUSIC_PUBLIC_MESSAGES === "true" ? "true" : "false/fehlt")
  );

  return { lines };
}

async function buildSpotifyLines() {
  const lines = [];
  const redirectUri = (process.env.SPOTIFY_REDIRECT_URI || "").trim();
  const hasTokens = await tableExists("spotify_user_tokens");

  lines.push(envStatus("SPOTIFY_CLIENT_ID"));
  lines.push(envStatus("SPOTIFY_CLIENT_SECRET"));
  lines.push(envStatus("SPOTIFY_REDIRECT_URI"));

  if (redirectUri && !isHttps(redirectUri)) {
    lines.push(warn("SPOTIFY_REDIRECT_URI: HTTP aktiv, HTTPS später für Spotify Login empfohlen"));
  }

  if (hasTokens) {
    lines.push(ok("spotify_user_tokens: " + await countRows("spotify_user_tokens")));
  } else {
    lines.push(warn("spotify_user_tokens fehlt"));
  }

  return { lines };
}

async function buildWebPanelLines(guild) {
  const lines = [];
  const enabled = String(process.env.WEB_PANEL_ENABLED || "false").toLowerCase() === "true";
  const port = process.env.WEB_PANEL_PORT || "3000";
  const baseUrl = process.env.WEB_PANEL_BASE_URL || "http://localhost:3000";
  const panelChannel = findTextChannel(guild, PANEL_CHANNEL_NAME);

  lines.push(enabled ? ok("WEB_PANEL_ENABLED: true") : warn("WEB_PANEL_ENABLED: false/fehlt"));
  lines.push("WEB_PANEL_PORT: " + port);
  lines.push("WEB_PANEL_BASE_URL: " + baseUrl);

  if (baseUrl && !isHttps(baseUrl)) {
    lines.push(warn("WEB_PANEL_BASE_URL: HTTP aktiv, für IP/Testbetrieb ok"));
  }

  lines.push(
    panelChannel
      ? ok("#" + PANEL_CHANNEL_NAME + " gefunden")
      : warn("#" + PANEL_CHANNEL_NAME + " fehlt")
  );

  return { lines };
}

async function buildSystemLines(interaction) {
  const lines = [];

  await db.execute("SELECT 1");
  lines.push(ok("DB erreichbar"));

  const tableStates = [];

  for (const table of IMPORTANT_TABLES) {
    tableStates.push((await tableExists(table) ? "✅ " : "❌ ") + table);
  }

  lines.push("Tabellen: " + tableStates.join(", "));
  lines.push(ok("Commands geladen: " + (interaction.client.commands?.size || 0)));
  lines.push("Node.js: " + process.version);
  lines.push("Bot: " + (interaction.client.user?.tag || "Unbekannt"));

  return { lines };
}

async function createBotStatusEmbed(interaction) {
  const guild = interaction.guild;
  const tempVoice = await safeStep("TempVoice", () => buildTempVoiceLines(guild));
  const music = await safeStep("Musik & Playlists", () => buildMusicLines(guild));
  const spotify = await safeStep("Spotify", () => buildSpotifyLines());
  const webpanel = await safeStep("Webpanel", () => buildWebPanelLines(guild));
  const system = await safeStep("System", () => buildSystemLines(interaction));

  return new EmbedBuilder()
    .setTitle("TempVoicePro Botstatus")
    .setColor(UI_COLORS.brand)
    .setDescription("Systemcheck für `" + guild.name + "`.")
    .addFields(
      {
        name: "TempVoice",
        value: limitValue(tempVoice.lines)
      },
      {
        name: "Musik & Playlists",
        value: limitValue(music.lines)
      },
      {
        name: "Spotify",
        value: limitValue(spotify.lines)
      },
      {
        name: "Webpanel",
        value: limitValue(webpanel.lines)
      },
      {
        name: "System",
        value: limitValue(system.lines)
      }
    )
    .setFooter({
      text: UI_FOOTERS.noSecrets
    })
    .setTimestamp();
}

module.exports = {
  createBotStatusEmbed
};

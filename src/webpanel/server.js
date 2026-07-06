const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const helmet = require("helmet");
const crypto = require("crypto");

const db = require("../database/mysql");

const {
  getAutoModSettings,
  updateAutoModSettings
} = require("../utils/autoModSettings");

const {
  getSpotifyConfig,
  exchangeSpotifyCode,
  getSpotifyProfile,
  saveSpotifyUserToken,
  getSpotifyConnection,
  deleteSpotifyConnection
} = require("../utils/spotifyUserAuth");

const DISCORD_API = "https://discord.com/api/v10";

const PERMISSION_ADMINISTRATOR = 1n << 3n;
const PERMISSION_MANAGE_GUILD = 1n << 5n;

function getConfig() {
  return {
    enabled: String(process.env.WEB_PANEL_ENABLED || "false").toLowerCase() === "true",
    port: Number(process.env.WEB_PANEL_PORT || 3000),
    baseUrl: process.env.WEB_PANEL_BASE_URL || "http://localhost:3000",
    clientId: (process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID || "").trim(),
    clientSecret: (process.env.DISCORD_CLIENT_SECRET || "").trim(),
    redirectUri: (process.env.DISCORD_REDIRECT_URI || "").trim(),
    sessionSecret: (process.env.SESSION_SECRET || "").trim()
  };
}

function getCookie(req, name) {
  const cookies = String(req.headers.cookie || "")
    .split(";")
    .map(item => item.trim());

  for (const cookie of cookies) {
    const index = cookie.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key = cookie.slice(0, index);
    const value = cookie.slice(index + 1);

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hasManageServerPermission(guild) {
  try {
    const permissions = BigInt(guild.permissions || "0");

    return Boolean(
      permissions & PERMISSION_ADMINISTRATOR ||
      permissions & PERMISSION_MANAGE_GUILD
    );
  } catch {
    return false;
  }
}

function layout(title, body) {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} - TempVoicePro</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: Arial, sans-serif;
      background: #0f1117;
      color: #f3f4f6;
    }

    body {
      margin: 0;
      background: linear-gradient(135deg, #111827, #0f1117);
      min-height: 100vh;
    }

    header {
      padding: 18px 28px;
      background: rgba(17, 24, 39, 0.92);
      border-bottom: 1px solid #273449;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .brand {
      font-weight: 800;
      font-size: 20px;
    }

    .muted {
      color: #9ca3af;
    }

    .card {
      background: rgba(31, 41, 55, 0.86);
      border: 1px solid #374151;
      border-radius: 16px;
      padding: 22px;
      margin-bottom: 18px;
      box-shadow: 0 16px 38px rgba(0,0,0,0.24);
    }

    .button {
      display: inline-block;
      padding: 11px 16px;
      border-radius: 12px;
      background: #5865f2;
      color: white;
      font-weight: 700;
      border: 0;
      cursor: pointer;
    }

    .button.secondary {
      background: #374151;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }

    .guild {
      display: block;
      border: 1px solid #374151;
      border-radius: 14px;
      padding: 16px;
      background: rgba(17, 24, 39, 0.7);
    }

    .guild:hover {
      border-color: #5865f2;
    }

    .pill {
      display: inline-block;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 12px;
      background: #14532d;
      color: #bbf7d0;
      margin-top: 10px;
    }

    .top-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/">TempVoicePro Webpanel</a>
    <div class="top-actions">
      <a class="button secondary" href="/dashboard">Dashboard</a>
      <a class="button secondary" href="/auth/logout">Logout</a>
    </div>
  </header>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

function requireLogin(req, res, next) {
  if (!req.session || !req.session.user || !req.session.accessToken) {
    return res.redirect("/auth/login");
  }

  return next();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function discordApiGet(path, accessToken) {
  const response = await fetch(DISCORD_API + path, {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  });

  if (response.status === 429) {
    const data = await response.json().catch(() => null);
    const retryAfterSeconds = Number(
      data && data.retry_after ? data.retry_after : response.headers.get("retry-after")
    ) || 2;

    console.warn("Webpanel Discord API Rate-Limit. Retry in " + retryAfterSeconds + "s.");

    await sleep(Math.min(retryAfterSeconds * 1000, 5000));

    const retryResponse = await fetch(DISCORD_API + path, {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    });

    if (!retryResponse.ok) {
      throw new Error("Discord API Fehler nach Retry: " + retryResponse.status);
    }

    return retryResponse.json();
  }

  if (!response.ok) {
    throw new Error("Discord API Fehler: " + response.status);
  }

  return response.json();
}

async function getUserGuilds(req, forceRefresh = false) {
  const cacheMs = 1000 * 60 * 5;
  const now = Date.now();

  if (
    !forceRefresh &&
    req.session.guildCache &&
    Array.isArray(req.session.guildCache.guilds) &&
    now - Number(req.session.guildCache.fetchedAt || 0) < cacheMs
  ) {
    return req.session.guildCache.guilds;
  }

  const guilds = await discordApiGet("/users/@me/guilds", req.session.accessToken);

  req.session.guildCache = {
    fetchedAt: now,
    guilds
  };

  return guilds;
}

async function exchangeCodeForToken(config, code) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri
  });

  const response = await fetch(DISCORD_API + "/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error("OAuth Token Fehler: " + response.status + " " + text);
  }

  return response.json();
}


function createSpotifyOAuthUrl(state) {
  const spotifyConfig = getSpotifyConfig();

  const params = new URLSearchParams({
    client_id: spotifyConfig.clientId,
    response_type: "code",
    redirect_uri: spotifyConfig.redirectUri,
    scope: "playlist-read-private playlist-read-collaborative",
    state
  });

  return "https://accounts.spotify.com/authorize?" + params.toString();
}

function createOAuthUrl(config, state) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state
  });

  return DISCORD_API + "/oauth2/authorize?" + params.toString();
}

function renderHome(user) {
  if (!user) {
    return layout("Login", `
      <div class="card">
        <h1>TempVoicePro Webpanel</h1>
        <p class="muted">Verwalte deinen Bot bequem im Browser statt alles über Discord Commands zu machen.</p>
        <p><a class="button" href="/auth/login">Mit Discord einloggen</a></p>
      </div>
    `);
  }

  return layout("Home", `
    <div class="card">
      <h1>Willkommen, ${escapeHtml(user.username)}</h1>
      <p class="muted">Du bist eingeloggt. Weiter zur Serverauswahl.</p>
      <p><a class="button" href="/dashboard">Dashboard öffnen</a></p>
    </div>
  `);
}

function renderDashboard(user, guilds, spotifyConnection = null) {
  const guildCards = guilds.length
    ? guilds.map(guild => `
      <a class="guild" href="/guilds/${escapeHtml(guild.id)}">
        <strong>${escapeHtml(guild.name)}</strong>
        <br>
        <span class="muted">Server-ID: ${escapeHtml(guild.id)}</span>
        <br>
        <span class="pill">Verwaltbar</span>
      </a>
    `).join("")
    : `<div class="card">
        <strong>Keine verwaltbaren Server gefunden.</strong>
        <p class="muted">Der Bot muss auf dem Server sein und du brauchst die Berechtigung Server verwalten oder Administrator.</p>
      </div>`;

  const spotifyCard = spotifyConnection
    ? `
      <div class="card">
        <h2>🎵 Spotify</h2>
        <p>Status: <span class="pill">Verbunden</span></p>
        <p class="muted">Account: ${escapeHtml(spotifyConnection.displayName || spotifyConnection.spotifyUserId || "Spotify")}</p>
        <form method="post" action="/spotify/disconnect">
          <button class="button secondary" type="submit">Spotify trennen</button>
        </form>
      </div>
    `
    : `
      <div class="card">
        <h2>🎵 Spotify</h2>
        <p>Status: <span class="pill" style="background:#7f1d1d;color:#fecaca;">Nicht verbunden</span></p>
        <p class="muted">Private Spotify-Playlists brauchen später Spotify-Login. Für öffentliche Nutzung über deine aktuelle HTTP-IP ist HTTPS empfohlen bzw. bei Spotify praktisch nötig.</p>
        <button class="button secondary" type="button" disabled style="opacity:0.65;cursor:not-allowed;">
          Spotify Login später mit HTTPS
        </button>
      </div>
    `;

  return layout("Dashboard", `
    <div class="card">
      <h1>Dashboard</h1>
      <p class="muted">Eingeloggt als ${escapeHtml(user.username)}.</p>
    </div>

    ${spotifyCard}

    <h2>Deine Server</h2>
    <div class="grid">
      ${guildCards}
    </div>
  `);
}


const DEFAULT_MODULES_WEBPANEL = [
  { name: "tempvoice", label: "TempVoice", defaultEnabled: true },
  { name: "music", label: "Music", defaultEnabled: true },
  { name: "playlist", label: "Playlist", defaultEnabled: true },
  { name: "gluecksrad", label: "Glücksrad", defaultEnabled: true },
  { name: "panels", label: "Panels", defaultEnabled: true },
  { name: "chatgpt", label: "ChatGPT", defaultEnabled: true },
  { name: "moderation", label: "Moderation", defaultEnabled: false },
  { name: "leveling", label: "Leveling", defaultEnabled: false },
  { name: "tickets", label: "Tickets", defaultEnabled: false }
];


function getBodyValue(body, name) {
  const value = body[name];

  if (Array.isArray(value)) {
    return value[value.length - 1];
  }

  return value;
}

function getBodyBool(body, name) {
  return String(getBodyValue(body, name) || "false") === "true";
}

function getBodyInt(body, name, fallback) {
  const value = Number(getBodyValue(body, name));

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function boolPill(value) {
  return value
    ? '<span class="pill">Aktiv</span>'
    : '<span class="pill" style="background:#7f1d1d;color:#fecaca;">Inaktiv</span>';
}

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return days + "d " + hours + "h " + minutes + "m";
  }

  if (hours > 0) {
    return hours + "h " + minutes + "m";
  }

  return minutes + "m";
}

async function getGuildModuleOverview(guildId) {
  const [rows] = await db.query(
    `
      SELECT moduleName, enabled
      FROM guild_modules
      WHERE guildId = ?
    `,
    [guildId]
  ).catch(() => [[]]);

  const saved = new Map(
    rows.map(row => [row.moduleName, Boolean(row.enabled)])
  );

  return DEFAULT_MODULES_WEBPANEL.map(item => ({
    ...item,
    enabled: saved.has(item.name) ? saved.get(item.name) : item.defaultEnabled
  }));
}


async function setGuildModuleStatus(guildId, moduleName, enabled) {
  const knownModule = DEFAULT_MODULES_WEBPANEL.find(item => item.name === moduleName);

  if (!knownModule) {
    throw new Error("Unbekanntes Modul: " + moduleName);
  }

  await db.query(
    `
      INSERT INTO guild_modules (guildId, moduleName, enabled)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        enabled = VALUES(enabled),
        updatedAt = CURRENT_TIMESTAMP
    `,
    [guildId, moduleName, enabled ? 1 : 0]
  );
}

async function getModLogOverview(guildId) {
  const [rows] = await db.query(
    `
      SELECT modLogChannelId, enabled
      FROM guild_moderation_settings
      WHERE guildId = ?
      LIMIT 1
    `,
    [guildId]
  ).catch(() => [[]]);

  const row = rows[0];

  if (!row) {
    return {
      enabled: false,
      channelId: null
    };
  }

  return {
    enabled: Boolean(row.enabled),
    channelId: row.modLogChannelId || null
  };
}


async function setModLogOverview(guildId, enabled, channelId) {
  await db.query(
    `
      INSERT INTO guild_moderation_settings (guildId, modLogChannelId, enabled)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        modLogChannelId = VALUES(modLogChannelId),
        enabled = VALUES(enabled),
        updatedAt = CURRENT_TIMESTAMP
    `,
    [guildId, channelId || null, enabled ? 1 : 0]
  );
}

function getGuildTextChannels(discordGuild) {
  if (!discordGuild) {
    return [];
  }

  return Array.from(discordGuild.channels.cache.values())
    .filter(channel => channel && channel.type === 0)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(channel => ({
      id: channel.id,
      name: channel.name
    }));
}

function renderChannelOptions(channels, selectedChannelId) {
  const emptySelected = selectedChannelId ? "" : "selected";

  return [
    `<option value="" ${emptySelected}>Kein Channel ausgewählt</option>`,
    ...channels.map(channel => {
      const selected = channel.id === selectedChannelId ? "selected" : "";

      return `<option value="${escapeHtml(channel.id)}" ${selected}>#${escapeHtml(channel.name)}</option>`;
    })
  ].join("");
}

function renderModLogSettings(guildId, modLog, channels) {
  return `
    <form method="post" action="/guilds/${escapeHtml(guildId)}/modlog">
      ${renderCheckbox("enabled", "Modlog aktiv", modLog.enabled)}

      <label style="display:block;margin:12px 0;">
        <span class="muted">Modlog Channel</span>
        <select
          name="channelId"
          style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border-radius:10px;border:1px solid #374151;background:#111827;color:#f3f4f6;"
        >
          ${renderChannelOptions(channels, modLog.channelId)}
        </select>
      </label>

      <p class="muted">
        Aktuell:
        ${modLog.enabled && modLog.channelId ? "Aktiv in &lt;#" + escapeHtml(modLog.channelId) + "&gt;" : "Nicht eingerichtet oder deaktiviert"}
      </p>

      <button class="button" type="submit">Modlog speichern</button>
    </form>
  `;
}

function renderModuleList(guildId, modules) {
  return modules.map(module => {
    const nextEnabled = module.enabled ? "false" : "true";
    const buttonText = module.enabled ? "Deaktivieren" : "Aktivieren";
    const buttonClass = module.enabled ? "button secondary" : "button";

    return `
      <div class="guild">
        <strong>${escapeHtml(module.label)}</strong>
        <br>
        ${boolPill(module.enabled)}
        <form method="post" action="/guilds/${escapeHtml(guildId)}/modules/${escapeHtml(module.name)}" style="margin-top:12px;">
          <input type="hidden" name="enabled" value="${nextEnabled}">
          <button class="${buttonClass}" type="submit">${buttonText}</button>
        </form>
      </div>
    `;
  }).join("");
}


function checked(value) {
  return value ? "checked" : "";
}

function renderCheckbox(name, label, value) {
  return `
    <label style="display:flex;gap:10px;align-items:center;margin:8px 0;">
      <input type="hidden" name="${escapeHtml(name)}" value="false">
      <input type="checkbox" name="${escapeHtml(name)}" value="true" ${checked(value)}>
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function renderNumberInput(name, label, value, min, max) {
  return `
    <label style="display:block;margin:12px 0;">
      <span class="muted">${escapeHtml(label)}</span>
      <input
        type="number"
        name="${escapeHtml(name)}"
        value="${escapeHtml(value)}"
        min="${escapeHtml(min)}"
        max="${escapeHtml(max)}"
        style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border-radius:10px;border:1px solid #374151;background:#111827;color:#f3f4f6;"
      >
    </label>
  `;
}

function renderAutoModSettings(guildId, settings) {
  return `
    <form method="post" action="/guilds/${escapeHtml(guildId)}/automod">
      <div class="grid">
        <div class="guild">
          <strong>Grundsystem</strong>
          ${renderCheckbox("enabled", "Auto-Mod aktiv", settings.enabled)}
          ${renderCheckbox("autoWarnEnabled", "Auto-Warn aktiv", settings.autoWarnEnabled)}
        </div>

        <div class="guild">
          <strong>Anti-Spam</strong>
          ${renderCheckbox("antiSpamEnabled", "Anti-Spam aktiv", settings.antiSpamEnabled)}
          ${renderNumberInput("spamMessageLimit", "Nachrichtenlimit", settings.spamMessageLimit, 2, 20)}
          ${renderNumberInput("spamIntervalSeconds", "Zeitfenster in Sekunden", settings.spamIntervalSeconds, 3, 60)}
        </div>

        <div class="guild">
          <strong>Anti-Link</strong>
          ${renderCheckbox("antiLinkEnabled", "Anti-Link aktiv", settings.antiLinkEnabled)}
          <p class="muted">Erkennt http, https, www und Discord Invite Links.</p>
        </div>

        <div class="guild">
          <strong>Anti-Caps</strong>
          ${renderCheckbox("antiCapsEnabled", "Anti-Caps aktiv", settings.antiCapsEnabled)}
          ${renderNumberInput("capsPercent", "Großbuchstaben-Grenze in Prozent", settings.capsPercent, 50, 100)}
          ${renderNumberInput("capsMinLength", "Mindestlänge der Nachricht", settings.capsMinLength, 5, 200)}
        </div>

        <div class="guild">
          <strong>Auto-Timeout</strong>
          ${renderCheckbox("timeoutEnabled", "Auto-Timeout aktiv", settings.timeoutEnabled)}
          ${renderNumberInput("timeoutMinutes", "Timeout-Dauer in Minuten", settings.timeoutMinutes, 1, 40320)}
        </div>
      </div>

      <p style="margin-top:18px;">
        <button class="button" type="submit">Auto-Mod speichern</button>
      </p>
    </form>
  `;
}


function renderGuildNav(guild, active) {
  const links = [
    { id: "overview", label: "Übersicht", href: "/guilds/" + guild.id },
    { id: "modules", label: "Module", href: "/guilds/" + guild.id + "/modules" },
    { id: "automod", label: "Auto-Mod", href: "/guilds/" + guild.id + "/automod" },
    { id: "modlog", label: "Modlog", href: "/guilds/" + guild.id + "/modlog" },
    { id: "cases", label: "Cases", href: "/guilds/" + guild.id + "/cases" }
  ];

  return `
    <div class="card">
      <h1>${escapeHtml(guild.name)}</h1>
      <p class="muted">Server-ID: ${escapeHtml(guild.id)}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
        ${links.map(link => {
          const cls = link.id === active ? "button" : "button secondary";

          return `<a class="${cls}" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`;
        }).join("")}
        <a class="button secondary" href="/dashboard">Zurück</a>
      </div>
    </div>
  `;
}

function renderGuildPage(guild, data) {
  return layout("Server", `
    ${renderGuildNav(guild, "overview")}

    <div class="grid">
      <div class="card">
        <h2>🤖 Bot Status</h2>
        <p>Status: ${data.bot.online ? "✅ Online" : "❌ Offline"}</p>
        <p>Ping: ${escapeHtml(String(data.bot.ping))} ms</p>
        <p>Uptime: ${escapeHtml(data.bot.uptime)}</p>
      </div>

      <div class="card">
        <h2>⚙️ Module</h2>
        <p>Aktiv: ${data.modules.filter(item => item.enabled).length} / ${data.modules.length}</p>
        <p><a class="button" href="/guilds/${escapeHtml(guild.id)}/modules">Module verwalten</a></p>
      </div>

      <div class="card">
        <h2>🤖 Auto-Mod</h2>
        <p>Status: ${data.autoMod.enabled ? "✅ Aktiv" : "❌ Inaktiv"}</p>
        <p><a class="button" href="/guilds/${escapeHtml(guild.id)}/automod">Auto-Mod verwalten</a></p>
      </div>

      <div class="card">
        <h2>🛡️ Modlog</h2>
        <p>${data.modLog.enabled && data.modLog.channelId ? "✅ Aktiv" : "❌ Nicht eingerichtet oder deaktiviert"}</p>
        <p><a class="button" href="/guilds/${escapeHtml(guild.id)}/modlog">Modlog verwalten</a></p>
      </div>

      <div class="card">
        <h2>📌 Cases</h2>
        <p>Moderation Cases anzeigen und prüfen.</p>
        <p><a class="button" href="/guilds/${escapeHtml(guild.id)}/cases">Cases öffnen</a></p>
      </div>
    </div>
  `);
}



async function getGuildPageData(client, guild) {
  const discordGuild = client.guilds.cache.get(guild.id);

  const [modules, autoMod, modLog] = await Promise.all([
    getGuildModuleOverview(guild.id),
    getAutoModSettings(guild.id),
    getModLogOverview(guild.id)
  ]);

  return {
    modules,
    autoMod,
    modLog,
    textChannels: getGuildTextChannels(discordGuild),
    bot: {
      online: Boolean(client.user),
      ping: Math.round(client.ws.ping),
      uptime: formatUptime(client.uptime || 0),
      guildName: discordGuild ? discordGuild.name : guild.name
    }
  };
}

async function getManageableGuildForRequest(client, req, guildId) {
  const guilds = await getUserGuilds(req);

  return guilds.find(item =>
    item.id === guildId &&
    hasManageServerPermission(item) &&
    client.guilds.cache.has(item.id)
  );
}


function webpanelActionLabel(actionType) {
  const labels = {
    warn: "⚠️ Warn",
    clearwarnings: "🧹 Warns gelöscht",
    timeout: "⏳ Timeout",
    untimeout: "✅ Timeout entfernt",
    kick: "👢 Kick",
    ban: "🔨 Ban",
    unban: "✅ Unban",
    automod: "🤖 Auto-Mod"
  };

  return labels[actionType] || actionType;
}

function webpanelDate(value) {
  const date = new Date(value);
  const timestamp = Math.floor(date.getTime() / 1000);

  if (!Number.isFinite(timestamp)) {
    return "Unbekannt";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

async function getWebpanelCases(guildId, options = {}) {
  const limit = Math.max(1, Math.min(50, Number(options.limit) || 15));
  const userId = String(options.userId || "").trim();
  const caseId = Number(options.caseId || 0);

  if (caseId > 0) {
    const [rows] = await db.query(
      `
        SELECT id, actionType, targetId, moderatorId, reason, details, createdAt
        FROM moderation_cases
        WHERE guildId = ? AND id = ?
        LIMIT 1
      `,
      [guildId, caseId]
    );

    return rows;
  }

  if (/^\d{15,25}$/.test(userId)) {
    const [rows] = await db.query(
      `
        SELECT id, actionType, targetId, moderatorId, reason, details, createdAt
        FROM moderation_cases
        WHERE guildId = ? AND targetId = ?
        ORDER BY id DESC
        LIMIT ?
      `,
      [guildId, userId, limit]
    );

    return rows;
  }

  const [rows] = await db.query(
    `
      SELECT id, actionType, targetId, moderatorId, reason, details, createdAt
      FROM moderation_cases
      WHERE guildId = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    [guildId, limit]
  );

  return rows;
}


async function hydrateCaseUsers(client, cases) {
  const cache = new Map();

  async function getUserLabel(userId) {
    if (!userId) {
      return "Unbekannt";
    }

    if (cache.has(userId)) {
      return cache.get(userId);
    }

    const user = await client.users.fetch(userId).catch(() => null);
    const label = user ? user.tag : "Unbekannter User";

    cache.set(userId, label);
    return label;
  }

  return Promise.all(
    cases.map(async item => ({
      ...item,
      targetLabel: await getUserLabel(item.targetId),
      moderatorLabel: await getUserLabel(item.moderatorId)
    }))
  );
}

function renderUserCell(label, userId) {
  return `
    <strong>${escapeHtml(label || "Unbekannter User")}</strong>
    <br>
    <span class="muted">${escapeHtml(userId)}</span>
  `;
}

function renderCaseRows(cases) {
  if (!cases || cases.length === 0) {
    return `
      <tr>
        <td colspan="6" class="muted">Keine Cases gefunden.</td>
      </tr>
    `;
  }

  return cases.map(item => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #374151;">#${escapeHtml(item.id)}</td>
      <td style="padding:10px;border-bottom:1px solid #374151;">${escapeHtml(webpanelActionLabel(item.actionType))}</td>
      <td style="padding:10px;border-bottom:1px solid #374151;">${renderUserCell(item.targetLabel, item.targetId)}</td>
      <td style="padding:10px;border-bottom:1px solid #374151;">${renderUserCell(item.moderatorLabel, item.moderatorId)}</td>
      <td style="padding:10px;border-bottom:1px solid #374151;">${escapeHtml(item.reason)}</td>
      <td style="padding:10px;border-bottom:1px solid #374151;">${escapeHtml(webpanelDate(item.createdAt))}</td>
    </tr>
  `).join("");
}

function renderGuildCasesPage(guild, data) {
  return layout("Cases", `
    ${renderGuildNav(guild, "cases")}

    <div class="card">
      <h2>📌 Moderation Cases</h2>
      <p class="muted">Zeigt die letzten Cases, Cases eines Users oder einen einzelnen Case.</p>

      <form method="get" action="/guilds/${escapeHtml(guild.id)}/cases" class="grid">
        <label style="display:block;">
          <span class="muted">User-ID filtern</span>
          <input
            type="text"
            name="userId"
            value="${escapeHtml(data.filters.userId)}"
            placeholder="Discord User-ID"
            style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border-radius:10px;border:1px solid #374151;background:#111827;color:#f3f4f6;"
          >
        </label>

        <label style="display:block;">
          <span class="muted">Case-ID anzeigen</span>
          <input
            type="number"
            name="caseId"
            value="${escapeHtml(data.filters.caseId)}"
            min="1"
            placeholder="z. B. 12"
            style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border-radius:10px;border:1px solid #374151;background:#111827;color:#f3f4f6;"
          >
        </label>

        <label style="display:block;">
          <span class="muted">Limit</span>
          <input
            type="number"
            name="limit"
            value="${escapeHtml(data.filters.limit)}"
            min="1"
            max="50"
            style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border-radius:10px;border:1px solid #374151;background:#111827;color:#f3f4f6;"
          >
        </label>

        <div style="display:flex;align-items:end;gap:10px;">
          <button class="button" type="submit">Suchen</button>
          <a class="button secondary" href="/guilds/${escapeHtml(guild.id)}/cases">Zurücksetzen</a>
        </div>
      </form>
    </div>

    <div class="card">
      <h2>Ergebnisse</h2>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #374151;">Case</th>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #374151;">Aktion</th>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #374151;">User</th>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #374151;">Moderator</th>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #374151;">Grund</th>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #374151;">Datum</th>
            </tr>
          </thead>
          <tbody>
            ${renderCaseRows(data.cases)}
          </tbody>
        </table>
      </div>
    </div>
  `);
}

function renderGuildModulesPage(guild, data) {
  return layout("Module", `
    ${renderGuildNav(guild, "modules")}

    <div class="card">
      <h2>⚙️ Module</h2>
      <p class="muted">Aktiviere oder deaktiviere Bot-Funktionen für diesen Server.</p>
      <div class="grid">
        ${renderModuleList(guild.id, data.modules)}
      </div>
    </div>
  `);
}

function renderGuildAutoModPage(guild, data) {
  return layout("Auto-Mod", `
    ${renderGuildNav(guild, "automod")}

    <div class="card">
      <h2>🤖 Auto-Mod</h2>
      <p class="muted">Konfiguriere automatische Prüfungen für Spam, Links und Caps.</p>
      ${renderAutoModSettings(guild.id, data.autoMod)}
    </div>
  `);
}

function renderGuildModLogPage(guild, data) {
  return layout("Modlog", `
    ${renderGuildNav(guild, "modlog")}

    <div class="card">
      <h2>🛡️ Modlog</h2>
      <p class="muted">Lege fest, wohin Moderations- und Auto-Mod-Ereignisse geschrieben werden.</p>
      ${renderModLogSettings(guild.id, data.modLog, data.textChannels)}
    </div>
  `);
}

function validateConfig(config) {
  const missing = [];

  if (!config.clientId) missing.push("DISCORD_CLIENT_ID");
  if (!config.clientSecret) missing.push("DISCORD_CLIENT_SECRET");
  if (!config.redirectUri) missing.push("DISCORD_REDIRECT_URI");
  if (!config.sessionSecret) missing.push("SESSION_SECRET");

  return missing;
}

function startWebPanel(client) {
  const config = getConfig();

  if (!config.enabled) {
    console.log("🌐 Webpanel ist deaktiviert. WEB_PANEL_ENABLED=true setzen zum Aktivieren.");
    return null;
  }

  const missing = validateConfig(config);

  if (missing.length > 0) {
    console.warn("⚠️ Webpanel nicht gestartet. Fehlende ENV-Werte: " + missing.join(", "));
    return null;
  }

  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet({
    contentSecurityPolicy: false
  }));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    createDatabaseTable: true,
    schema: {
      tableName: "webpanel_sessions"
    }
  });

  app.use(session({
    name: "tempvoicepro.sid",
    secret: config.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.baseUrl.startsWith("https://"),
      maxAge: 1000 * 60 * 60 * 24 * 30
    }
  }));

  app.get("/", (req, res) => {
    return res.send(renderHome(req.session.user));
  });

  app.get("/auth/login", (req, res) => {
    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauthState = state;

    res.cookie("tempvoicepro_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.baseUrl.startsWith("https://"),
      maxAge: 1000 * 60 * 10
    });

    req.session.save(error => {
      if (error) {
        console.error("Webpanel Session Save Fehler:", error);
        return res.status(500).send("Session konnte nicht gespeichert werden.");
      }

      return res.redirect(createOAuthUrl(config, state));
    });
  });

  app.get("/auth/callback", async (req, res) => {
    try {
      const code = String(req.query.code || "");
      const state = String(req.query.state || "");

      const cookieState = getCookie(req, "tempvoicepro_oauth_state");
      const validSessionState = state && req.session.oauthState && state === req.session.oauthState;
      const validCookieState = state && cookieState && state === cookieState;

      if (!code || !state || (!validSessionState && !validCookieState)) {
        console.warn("Webpanel OAuth State ungültig:", {
          hasCode: Boolean(code),
          hasState: Boolean(state),
          hasSessionState: Boolean(req.session.oauthState),
          hasCookieState: Boolean(cookieState)
        });

        return res.status(400).send(
          "Ungültiger OAuth State. Bitte zurück zur Startseite und erneut einloggen: <a href='/'>Zur Startseite</a>"
        );
      }

      res.clearCookie("tempvoicepro_oauth_state");

      const token = await exchangeCodeForToken(config, code);
      const user = await discordApiGet("/users/@me", token.access_token);

      req.session.accessToken = token.access_token;
      req.session.refreshToken = token.refresh_token;
      req.session.user = {
        id: user.id,
        username: user.username,
        avatar: user.avatar
      };

      delete req.session.oauthState;

      return req.session.save(error => {
        if (error) {
          console.error("Webpanel Session Save Fehler nach Login:", error);
          return res.status(500).send("Login-Session konnte nicht gespeichert werden.");
        }

        return res.redirect("/dashboard");
      });
    } catch (error) {
      console.error("Webpanel OAuth Fehler:", error);
      return res.status(500).send("Login fehlgeschlagen.");
    }
  });

  app.get("/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("tempvoicepro.sid");
      res.clearCookie("tempvoicepro_oauth_state");
      res.redirect("/");
    });
  });

  app.get("/dashboard", requireLogin, async (req, res) => {
    try {
      const guilds = await getUserGuilds(req);

      const manageableGuilds = guilds
        .filter(hasManageServerPermission)
        .filter(guild => client.guilds.cache.has(guild.id));

      const spotifyConnection = await getSpotifyConnection(req.session.user.id);

      return res.send(renderDashboard(
        req.session.user,
        manageableGuilds,
        spotifyConnection
      ));
    } catch (error) {
      console.error("Webpanel Dashboard Fehler:", error);
      return res.status(500).send("Dashboard konnte nicht geladen werden.");
    }
  });

  app.get("/guilds/:guildId", requireLogin, async (req, res) => {
    try {
      const guild = await getManageableGuildForRequest(client, req, req.params.guildId);

      if (!guild) {
        return res.status(403).send("Du darfst diesen Server nicht verwalten oder der Bot ist nicht auf diesem Server.");
      }

      const data = await getGuildPageData(client, guild);

      return res.send(renderGuildPage(guild, data));
    } catch (error) {
      console.error("Webpanel Server Fehler:", error);
      return res.status(500).send("Serverseite konnte nicht geladen werden.");
    }
  });


  app.post("/guilds/:guildId/modules/:moduleName", requireLogin, async (req, res) => {
    try {
      const guild = await getManageableGuildForRequest(
        client,
        req,
        req.params.guildId
      );

      if (!guild) {
        return res.status(403).send("Du darfst diesen Server nicht verwalten oder der Bot ist nicht auf diesem Server.");
      }

      const moduleName = String(req.params.moduleName || "").trim().toLowerCase();
      const enabled = String(req.body.enabled || "false") === "true";

      await setGuildModuleStatus(guild.id, moduleName, enabled);

      return res.redirect("/guilds/" + guild.id + "/modules");
    } catch (error) {
      console.error("Webpanel Modul-Schalter Fehler:", error);
      return res.status(500).send("Modul konnte nicht geändert werden.");
    }
  });


  app.post("/guilds/:guildId/automod", requireLogin, async (req, res) => {
    try {
      const guild = await getManageableGuildForRequest(
        client,
        req,
        req.params.guildId
      );

      if (!guild) {
        return res.status(403).send("Du darfst diesen Server nicht verwalten oder der Bot ist nicht auf diesem Server.");
      }

      await updateAutoModSettings(guild.id, {
        enabled: getBodyBool(req.body, "enabled"),
        antiSpamEnabled: getBodyBool(req.body, "antiSpamEnabled"),
        antiLinkEnabled: getBodyBool(req.body, "antiLinkEnabled"),
        antiCapsEnabled: getBodyBool(req.body, "antiCapsEnabled"),
        autoWarnEnabled: getBodyBool(req.body, "autoWarnEnabled"),
        timeoutEnabled: getBodyBool(req.body, "timeoutEnabled"),
        spamMessageLimit: getBodyInt(req.body, "spamMessageLimit", 5),
        spamIntervalSeconds: getBodyInt(req.body, "spamIntervalSeconds", 8),
        capsMinLength: getBodyInt(req.body, "capsMinLength", 12),
        capsPercent: getBodyInt(req.body, "capsPercent", 70),
        timeoutMinutes: getBodyInt(req.body, "timeoutMinutes", 10)
      });

      return res.redirect("/guilds/" + guild.id + "/automod");
    } catch (error) {
      console.error("Webpanel Auto-Mod Formular Fehler:", error);
      return res.status(500).send("Auto-Mod Einstellungen konnten nicht gespeichert werden.");
    }
  });


  app.post("/guilds/:guildId/modlog", requireLogin, async (req, res) => {
    try {
      const guild = await getManageableGuildForRequest(
        client,
        req,
        req.params.guildId
      );

      if (!guild) {
        return res.status(403).send("Du darfst diesen Server nicht verwalten oder der Bot ist nicht auf diesem Server.");
      }

      const discordGuild = client.guilds.cache.get(guild.id);
      const enabled = getBodyBool(req.body, "enabled");
      const channelId = String(getBodyValue(req.body, "channelId") || "").trim();

      if (enabled) {
        const channelExists = discordGuild &&
          discordGuild.channels.cache.has(channelId);

        if (!channelId || !channelExists) {
          return res.status(400).send("Bitte wähle einen gültigen Modlog-Channel aus.");
        }
      }

      await setModLogOverview(guild.id, enabled, channelId);

      return res.redirect("/guilds/" + guild.id + "/modlog");
    } catch (error) {
      console.error("Webpanel Modlog Formular Fehler:", error);
      return res.status(500).send("Modlog Einstellungen konnten nicht gespeichert werden.");
    }
  });


  app.get("/guilds/:guildId/modules", requireLogin, async (req, res) => {
    try {
      const guild = await getManageableGuildForRequest(client, req, req.params.guildId);

      if (!guild) {
        return res.status(403).send("Du darfst diesen Server nicht verwalten oder der Bot ist nicht auf diesem Server.");
      }

      const data = await getGuildPageData(client, guild);

      return res.send(renderGuildModulesPage(guild, data));
    } catch (error) {
      console.error("Webpanel Module-Seite Fehler:", error);
      return res.status(500).send("Module-Seite konnte nicht geladen werden.");
    }
  });

  app.get("/guilds/:guildId/automod", requireLogin, async (req, res) => {
    try {
      const guild = await getManageableGuildForRequest(client, req, req.params.guildId);

      if (!guild) {
        return res.status(403).send("Du darfst diesen Server nicht verwalten oder der Bot ist nicht auf diesem Server.");
      }

      const data = await getGuildPageData(client, guild);

      return res.send(renderGuildAutoModPage(guild, data));
    } catch (error) {
      console.error("Webpanel Auto-Mod-Seite Fehler:", error);
      return res.status(500).send("Auto-Mod-Seite konnte nicht geladen werden.");
    }
  });

  app.get("/guilds/:guildId/modlog", requireLogin, async (req, res) => {
    try {
      const guild = await getManageableGuildForRequest(client, req, req.params.guildId);

      if (!guild) {
        return res.status(403).send("Du darfst diesen Server nicht verwalten oder der Bot ist nicht auf diesem Server.");
      }

      const data = await getGuildPageData(client, guild);

      return res.send(renderGuildModLogPage(guild, data));
    } catch (error) {
      console.error("Webpanel Modlog-Seite Fehler:", error);
      return res.status(500).send("Modlog-Seite konnte nicht geladen werden.");
    }
  });


  app.get("/guilds/:guildId/cases", requireLogin, async (req, res) => {
    try {
      const guild = await getManageableGuildForRequest(client, req, req.params.guildId);

      if (!guild) {
        return res.status(403).send("Du darfst diesen Server nicht verwalten oder der Bot ist nicht auf diesem Server.");
      }

      const filters = {
        userId: String(req.query.userId || "").trim(),
        caseId: String(req.query.caseId || "").trim(),
        limit: String(req.query.limit || "15").trim()
      };

      const rawCases = await getWebpanelCases(guild.id, filters);
      const cases = await hydrateCaseUsers(client, rawCases);

      return res.send(renderGuildCasesPage(guild, {
        filters,
        cases
      }));
    } catch (error) {
      console.error("Webpanel Cases-Seite Fehler:", error);
      return res.status(500).send("Cases-Seite konnte nicht geladen werden.");
    }
  });


  app.get("/spotify/login", requireLogin, (req, res) => {
    try {
      const spotifyConfig = getSpotifyConfig();

      if (!spotifyConfig.clientId || !spotifyConfig.clientSecret || !spotifyConfig.redirectUri) {
        return res.status(500).send(
          "Spotify Login ist nicht vollständig eingerichtet. Bitte SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET und SPOTIFY_REDIRECT_URI prüfen."
        );
      }

      const state = crypto.randomBytes(16).toString("hex");
      req.session.spotifyOAuthState = state;

      res.cookie("tempvoicepro_spotify_state", state, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.baseUrl.startsWith("https://"),
        maxAge: 1000 * 60 * 10
      });

      req.session.save(error => {
        if (error) {
          console.error("Spotify Session Save Fehler:", error);
          return res.status(500).send("Spotify Session konnte nicht gespeichert werden.");
        }

        return res.redirect(createSpotifyOAuthUrl(state));
      });
    } catch (error) {
      console.error("Spotify Login Start Fehler:", error);
      return res.status(500).send("Spotify Login konnte nicht gestartet werden.");
    }
  });

  app.get("/spotify/callback", async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).send("Bitte zuerst im Webpanel mit Discord einloggen.");
      }

      const code = String(req.query.code || "");
      const state = String(req.query.state || "");
      const cookieState = getCookie(req, "tempvoicepro_spotify_state");

      const validSessionState = state && req.session.spotifyOAuthState && state === req.session.spotifyOAuthState;
      const validCookieState = state && cookieState && state === cookieState;

      if (!code || !state || (!validSessionState && !validCookieState)) {
        console.warn("Spotify OAuth State ungültig:", {
          hasCode: Boolean(code),
          hasState: Boolean(state),
          hasSessionState: Boolean(req.session.spotifyOAuthState),
          hasCookieState: Boolean(cookieState)
        });

        return res.status(400).send(
          "Ungültiger Spotify OAuth State. Bitte zurück zum Webpanel und erneut verbinden."
        );
      }

      res.clearCookie("tempvoicepro_spotify_state");

      const tokenData = await exchangeSpotifyCode(code);
      const profile = await getSpotifyProfile(tokenData.access_token);

      await saveSpotifyUserToken(
        req.session.user.id,
        tokenData,
        profile
      );

      delete req.session.spotifyOAuthState;

      return req.session.save(error => {
        if (error) {
          console.error("Spotify Session Save Fehler nach Login:", error);
          return res.status(500).send("Spotify Login-Session konnte nicht gespeichert werden.");
        }

        return res.redirect("/dashboard");
      });
    } catch (error) {
      console.error("Spotify OAuth Callback Fehler:", error);
      return res.status(500).send("Spotify Login fehlgeschlagen.");
    }
  });

  app.post("/spotify/disconnect", requireLogin, async (req, res) => {
    try {
      await deleteSpotifyConnection(req.session.user.id);

      return res.redirect("/dashboard");
    } catch (error) {
      console.error("Spotify Disconnect Fehler:", error);
      return res.status(500).send("Spotify Verbindung konnte nicht getrennt werden.");
    }
  });

  app.get("/spotify/status", requireLogin, async (req, res) => {
    try {
      const connection = await getSpotifyConnection(req.session.user.id);

      return res.json({
        connected: Boolean(connection),
        displayName: connection ? connection.displayName : null,
        spotifyUserId: connection ? connection.spotifyUserId : null
      });
    } catch (error) {
      console.error("Spotify Status Fehler:", error);
      return res.status(500).json({
        connected: false,
        error: "Spotify Status konnte nicht geladen werden."
      });
    }
  });

  app.listen(config.port, "0.0.0.0", () => {
    console.log("🌐 Webpanel läuft auf Port " + config.port);
    console.log("🌐 Webpanel URL: " + config.baseUrl);
  });

  return app;
}

module.exports = {
  startWebPanel
};

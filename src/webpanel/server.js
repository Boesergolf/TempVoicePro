const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const crypto = require("crypto");

const db = require("../database/mysql");

const {
  getAutoModSettings
} = require("../utils/autoModSettings");

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

function renderDashboard(user, guilds) {
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

  return layout("Dashboard", `
    <div class="card">
      <h1>Dashboard</h1>
      <p class="muted">Eingeloggt als ${escapeHtml(user.username)}.</p>
    </div>

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


function renderAutoModSettings(settings) {
  return `
    <div class="grid">
      <div class="guild"><strong>Auto-Mod</strong><br>${boolPill(settings.enabled)}</div>
      <div class="guild"><strong>Anti-Spam</strong><br>${boolPill(settings.antiSpamEnabled)}<br><span class="muted">${settings.spamMessageLimit} Nachrichten / ${settings.spamIntervalSeconds}s</span></div>
      <div class="guild"><strong>Anti-Link</strong><br>${boolPill(settings.antiLinkEnabled)}</div>
      <div class="guild"><strong>Anti-Caps</strong><br>${boolPill(settings.antiCapsEnabled)}<br><span class="muted">${settings.capsPercent}% ab ${settings.capsMinLength} Zeichen</span></div>
      <div class="guild"><strong>Auto-Warn</strong><br>${boolPill(settings.autoWarnEnabled)}</div>
      <div class="guild"><strong>Auto-Timeout</strong><br>${boolPill(settings.timeoutEnabled)}<br><span class="muted">${settings.timeoutMinutes} Minuten</span></div>
    </div>
  `;
}

function renderGuildPage(guild, data) {
  const modlogText = data.modLog.enabled && data.modLog.channelId
    ? "Aktiv in <#" + data.modLog.channelId + ">"
    : "Nicht eingerichtet oder deaktiviert";

  return layout("Server", `
    <div class="card">
      <h1>${escapeHtml(guild.name)}</h1>
      <p class="muted">Server-ID: ${escapeHtml(guild.id)}</p>
      <a class="button secondary" href="/dashboard">Zurück</a>
    </div>

    <div class="grid">
      <div class="card">
        <h2>🤖 Bot Status</h2>
        <p>Status: ${data.bot.online ? "✅ Online" : "❌ Offline"}</p>
        <p>Ping: ${escapeHtml(String(data.bot.ping))} ms</p>
        <p>Uptime: ${escapeHtml(data.bot.uptime)}</p>
      </div>

      <div class="card">
        <h2>🛡️ Modlog</h2>
        <p>${modlogText}</p>
      </div>

      <div class="card">
        <h2>⚙️ Module</h2>
        <p>Aktiv: ${data.modules.filter(item => item.enabled).length} / ${data.modules.length}</p>
        <p class="muted">Bearbeiten bauen wir im nächsten Schritt ein.</p>
      </div>
    </div>

    <div class="card">
      <h2>⚙️ Module</h2>
      <div class="grid">
        ${renderModuleList(guild.id, data.modules)}
      </div>
    </div>

    <div class="card">
      <h2>🤖 Auto-Mod</h2>
      ${renderAutoModSettings(data.autoMod)}
    </div>
  `);
}



async function getManageableGuildForRequest(client, req, guildId) {
  const guilds = await getUserGuilds(req);

  return guilds.find(item =>
    item.id === guildId &&
    hasManageServerPermission(item) &&
    client.guilds.cache.has(item.id)
  );
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

  app.use(session({
    name: "tempvoicepro.sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.baseUrl.startsWith("https://"),
      maxAge: 1000 * 60 * 60 * 24 * 7
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

      return res.send(renderDashboard(req.session.user, manageableGuilds));
    } catch (error) {
      console.error("Webpanel Dashboard Fehler:", error);
      return res.status(500).send("Dashboard konnte nicht geladen werden.");
    }
  });

  app.get("/guilds/:guildId", requireLogin, async (req, res) => {
    try {
      const guilds = await getUserGuilds(req);

      const guild = guilds.find(item =>
        item.id === req.params.guildId &&
        hasManageServerPermission(item) &&
        client.guilds.cache.has(item.id)
      );

      if (!guild) {
        return res.status(403).send("Du darfst diesen Server nicht verwalten oder der Bot ist nicht auf diesem Server.");
      }

      const discordGuild = client.guilds.cache.get(guild.id);

      const [modules, autoMod, modLog] = await Promise.all([
        getGuildModuleOverview(guild.id),
        getAutoModSettings(guild.id),
        getModLogOverview(guild.id)
      ]);

      return res.send(renderGuildPage(guild, {
        modules,
        autoMod,
        modLog,
        bot: {
          online: Boolean(client.user),
          ping: Math.round(client.ws.ping),
          uptime: formatUptime(client.uptime || 0),
          guildName: discordGuild ? discordGuild.name : guild.name
        }
      }));
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

      return res.redirect("/guilds/" + guild.id);
    } catch (error) {
      console.error("Webpanel Modul-Schalter Fehler:", error);
      return res.status(500).send("Modul konnte nicht geändert werden.");
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

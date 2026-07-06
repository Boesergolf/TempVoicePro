const db = require("../database/mysql");

const SPOTIFY_ACCOUNTS_API = "https://accounts.spotify.com/api";
const SPOTIFY_WEB_API = "https://api.spotify.com/v1";

let tableReadyPromise = null;

async function ensureSpotifyUserTokensTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = db.query(`
      CREATE TABLE IF NOT EXISTS spotify_user_tokens (
        discordUserId VARCHAR(32) NOT NULL PRIMARY KEY,
        spotifyUserId VARCHAR(128) NULL,
        displayName VARCHAR(255) NULL,
        accessToken TEXT NOT NULL,
        refreshToken TEXT NOT NULL,
        expiresAt BIGINT NOT NULL,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }

  await tableReadyPromise;
}

function getSpotifyConfig() {
  return {
    clientId: (process.env.SPOTIFY_CLIENT_ID || "").trim(),
    clientSecret: (process.env.SPOTIFY_CLIENT_SECRET || "").trim(),
    redirectUri: (process.env.SPOTIFY_REDIRECT_URI || "").trim()
  };
}

function requireSpotifyConfig() {
  const config = getSpotifyConfig();
  const missing = [];

  if (!config.clientId) missing.push("SPOTIFY_CLIENT_ID");
  if (!config.clientSecret) missing.push("SPOTIFY_CLIENT_SECRET");
  if (!config.redirectUri) missing.push("SPOTIFY_REDIRECT_URI");

  if (missing.length > 0) {
    throw new Error("Fehlende Spotify ENV-Werte: " + missing.join(", "));
  }

  return config;
}

function encodeBasicAuth(clientId, clientSecret) {
  return Buffer
    .from(clientId + ":" + clientSecret)
    .toString("base64");
}

async function spotifyTokenRequest(params) {
  const config = requireSpotifyConfig();

  const response = await fetch(SPOTIFY_ACCOUNTS_API + "/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + encodeBasicAuth(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(params)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error("Spotify Token Fehler: " + response.status + " " + text.slice(0, 300));
  }

  return response.json();
}

async function exchangeSpotifyCode(code) {
  const config = requireSpotifyConfig();

  return spotifyTokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri
  });
}

async function refreshSpotifyToken(refreshToken) {
  return spotifyTokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
}

async function spotifyApiGet(path, accessToken) {
  const response = await fetch(SPOTIFY_WEB_API + path, {
    headers: {
      "Authorization": "Bearer " + accessToken
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error("Spotify API Fehler: " + response.status + " " + text.slice(0, 300));
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function getSpotifyProfile(accessToken) {
  return spotifyApiGet("/me", accessToken);
}

async function saveSpotifyUserToken(discordUserId, tokenData, profile) {
  await ensureSpotifyUserTokensTable();

  const now = Date.now();
  const expiresIn = Number(tokenData.expires_in) || 3600;
  const expiresAt = now + expiresIn * 1000 - 60 * 1000;

  await db.query(
    `
      INSERT INTO spotify_user_tokens
        (discordUserId, spotifyUserId, displayName, accessToken, refreshToken, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        spotifyUserId = VALUES(spotifyUserId),
        displayName = VALUES(displayName),
        accessToken = VALUES(accessToken),
        refreshToken = VALUES(refreshToken),
        expiresAt = VALUES(expiresAt),
        updatedAt = CURRENT_TIMESTAMP
    `,
    [
      discordUserId,
      profile && profile.id ? profile.id : null,
      profile && profile.display_name ? profile.display_name : null,
      tokenData.access_token,
      tokenData.refresh_token,
      expiresAt
    ]
  );
}

async function getSpotifyConnection(discordUserId) {
  await ensureSpotifyUserTokensTable();

  const [rows] = await db.query(
    `
      SELECT discordUserId, spotifyUserId, displayName, accessToken, refreshToken, expiresAt, updatedAt
      FROM spotify_user_tokens
      WHERE discordUserId = ?
      LIMIT 1
    `,
    [discordUserId]
  );

  return rows[0] || null;
}

async function deleteSpotifyConnection(discordUserId) {
  await ensureSpotifyUserTokensTable();

  await db.query(
    `
      DELETE FROM spotify_user_tokens
      WHERE discordUserId = ?
      LIMIT 1
    `,
    [discordUserId]
  );
}

async function getValidSpotifyAccessToken(discordUserId) {
  const connection = await getSpotifyConnection(discordUserId);

  if (!connection) {
    return null;
  }

  if (Date.now() < Number(connection.expiresAt || 0)) {
    return connection.accessToken;
  }

  const refreshed = await refreshSpotifyToken(connection.refreshToken);

  const nextRefreshToken = refreshed.refresh_token || connection.refreshToken;
  const profile = {
    id: connection.spotifyUserId,
    display_name: connection.displayName
  };

  await saveSpotifyUserToken(discordUserId, {
    ...refreshed,
    refresh_token: nextRefreshToken
  }, profile);

  const updated = await getSpotifyConnection(discordUserId);
  return updated ? updated.accessToken : null;
}

module.exports = {
  ensureSpotifyUserTokensTable,
  getSpotifyConfig,
  exchangeSpotifyCode,
  getSpotifyProfile,
  saveSpotifyUserToken,
  getSpotifyConnection,
  deleteSpotifyConnection,
  getValidSpotifyAccessToken,
  spotifyApiGet
};

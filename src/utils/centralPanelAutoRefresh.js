const {
  createMusicCentralMessage,
  createMusicQueueCentralMessage,
  createMusicNowCentralMessage,
  createMusicRadioCentralMessage
} = require("./panelHubMusic");

let refreshTimer = null;
let refreshRunning = false;

function getRefreshIntervalMs() {
  const value = Number(process.env.CENTRAL_PANEL_AUTO_REFRESH_MS || 10000);

  if (!Number.isFinite(value)) {
    return 10000;
  }

  return Math.max(5000, Math.min(value, 5 * 60 * 1000));
}

function getPanelChannelName() {
  return process.env.PANEL_CHANNEL_NAME || "bot-panels";
}

function isEnabled() {
  return process.env.CENTRAL_PANEL_AUTO_REFRESH !== "false";
}

function isDebugEnabled() {
  return process.env.CENTRAL_PANEL_AUTO_REFRESH_DEBUG === "true";
}

function debugLog(...args) {
  if (isDebugEnabled()) {
    console.log("🔎 Zentralpanel Auto-Refresh:", ...args);
  }
}

function isUsableTextChannel(channel) {
  return Boolean(
    channel &&
    typeof channel.isTextBased === "function" &&
    channel.isTextBased() &&
    channel.messages &&
    typeof channel.messages.fetch === "function"
  );
}

function getComponentIds(message) {
  const ids = [];

  for (const row of message.components || []) {
    for (const component of row.components || []) {
      const customId =
        component.customId ||
        component.custom_id ||
        (component.data && component.data.custom_id) ||
        (component.data && component.data.customId);

      if (customId) {
        ids.push(customId);
      }
    }
  }

  return ids;
}

function getCentralPanelView(message) {
  if (!message) {
    return null;
  }

  const embed = message.embeds && message.embeds.length
    ? message.embeds[0]
    : null;

  const title = embed && embed.title ? embed.title : "";
  const footer = embed && embed.footer && embed.footer.text
    ? embed.footer.text
    : "";

  const componentIds = getComponentIds(message);

  if (
    footer.includes("TempVoicePro Musik Zentralpanel") ||
    title.includes("Musiksteuerung") ||
    componentIds.includes("panel_hub_music_refresh") ||
    componentIds.includes("mp_play") ||
    componentIds.includes("mp_pause") ||
    componentIds.includes("mp_resume") ||
    componentIds.includes("mp_skip") ||
    componentIds.includes("mp_stop")
  ) {
    return "music";
  }

  if (
    footer.includes("TempVoicePro Musik Queue") ||
    title.includes("Musik Queue")
  ) {
    return "queue";
  }

  if (
    footer.includes("TempVoicePro Musik Now") ||
    title.includes("Now Playing")
  ) {
    return "now";
  }

  if (
    footer.includes("TempVoicePro Musik Radio") ||
    title.includes("Radio") ||
    componentIds.includes("mp_radio_play") ||
    componentIds.includes("mp_radio_stop") ||
    componentIds.includes("mp_radio_refresh")
  ) {
    return "radio";
  }

  return null;
}

function createMessageForView(view, guildId) {
  if (view === "music") {
    return createMusicCentralMessage(guildId);
  }

  if (view === "queue") {
    return createMusicQueueCentralMessage(guildId);
  }

  if (view === "now") {
    return createMusicNowCentralMessage(guildId);
  }

  if (view === "radio") {
    return createMusicRadioCentralMessage(guildId);
  }

  return null;
}

async function findPanelChannels(guild) {
  await guild.channels.fetch().catch(() => null);

  const channels = [...guild.channels.cache.values()]
    .filter(isUsableTextChannel);

  const panelName = getPanelChannelName();
  const exact = channels.filter(channel => channel.name === panelName);

  if (exact.length > 0) {
    debugLog("Panel-Channel per Name gefunden:", exact.map(c => "#" + c.name).join(", "));
    return exact;
  }

  const fuzzy = channels.filter(channel => {
    const name = String(channel.name || "").toLowerCase();
    return name.includes("panel") || name.includes("bot");
  });

  if (fuzzy.length > 0) {
    debugLog(
      "Kein exakter Panel-Channel. Scanne zuerst mögliche Panel-Channels, danach alle:",
      fuzzy.map(c => "#" + c.name).join(", ")
    );
  } else {
    debugLog("Kein Panel-Channel per Name gefunden. Scanne alle Textchannels:", channels.length);
  }

  const ordered = new Map();

  for (const channel of fuzzy) {
    ordered.set(channel.id, channel);
  }

  for (const channel of channels) {
    ordered.set(channel.id, channel);
  }

  return [...ordered.values()];
}

function addFetchedMessages(candidates, fetched) {
  if (!fetched) {
    return;
  }

  if (typeof fetched.values === "function") {
    for (const message of fetched.values()) {
      candidates.set(message.id, message);
    }

    return;
  }

  if (Array.isArray(fetched)) {
    for (const message of fetched) {
      if (message && message.id) {
        candidates.set(message.id, message);
      }
    }

    return;
  }

  if (fetched.items && typeof fetched.items.values === "function") {
    for (const pin of fetched.items.values()) {
      const message = pin.message || pin;

      if (message && message.id) {
        candidates.set(message.id, message);
      }
    }

    return;
  }

  if (Array.isArray(fetched.items)) {
    for (const pin of fetched.items) {
      const message = pin.message || pin;

      if (message && message.id) {
        candidates.set(message.id, message);
      }
    }
  }
}

async function fetchCandidateMessages(channel) {
  const candidates = new Map();

  const recentMessages = await channel.messages.fetch({
    limit: 100
  }).catch(() => null);

  addFetchedMessages(candidates, recentMessages);

  const pinnedMessages = await (
    typeof channel.messages.fetchPins === "function"
      ? channel.messages.fetchPins()
      : channel.messages.fetchPinned()
  ).catch(() => null);

  addFetchedMessages(candidates, pinnedMessages);

  return [...candidates.values()];
}

async function refreshCentralPanelInGuild(guild, client) {
  if (!client.user) {
    return { refreshed: 0 };
  }

  const channels = await findPanelChannels(guild);

  if (!channels.length) {
    debugLog("keine nutzbaren Textchannels gefunden in", guild.name);
    return { refreshed: 0 };
  }

  let refreshed = 0;

  for (const channel of channels) {
    const messages = await fetchCandidateMessages(channel);

    debugLog(
      "Prüfe Channel:",
      "#" + channel.name,
      "Kandidaten:",
      messages.length
    );

    for (const message of messages) {
      if (!message.author || message.author.id !== client.user.id) {
        continue;
      }

      if (isDebugEnabled()) {
        const embed = message.embeds && message.embeds.length ? message.embeds[0] : null;
        const title = embed && embed.title ? embed.title : "-";
        const footer = embed && embed.footer && embed.footer.text ? embed.footer.text : "-";
        const ids = getComponentIds(message);

        debugLog(
          "Bot-Nachricht:",
          "#" + channel.name,
          message.id,
          "Titel:",
          title,
          "Footer:",
          footer,
          "Buttons:",
          ids.length ? ids.join(",") : "-"
        );
      }

      const view = getCentralPanelView(message);

      if (!view) {
        continue;
      }

      debugLog("Zentralpanel gefunden:", "#" + channel.name, message.id, "View:", view);

      const updatePayload = createMessageForView(view, guild.id);

      if (!updatePayload) {
        continue;
      }

      await message.edit(updatePayload).then(() => {
        refreshed++;
        debugLog("Nachricht aktualisiert:", message.id);
      }).catch(error => {
        console.warn(
          "⚠️ Zentralpanel Auto-Refresh konnte Nachricht nicht aktualisieren:",
          message.id,
          error.message
        );
      });
    }
  }

  return { refreshed };
}

async function refreshAllCentralPanels(client) {
  if (refreshRunning) {
    return;
  }

  refreshRunning = true;

  try {
    let total = 0;

    for (const guild of client.guilds.cache.values()) {
      const result = await refreshCentralPanelInGuild(guild, client);
      total += result.refreshed;
    }

    debugLog("Refresh abgeschlossen. Aktualisiert:", total);
  } catch (error) {
    console.error("❌ Zentralpanel Auto-Refresh Fehler:", error);
  } finally {
    refreshRunning = false;
  }
}

function startCentralPanelAutoRefresh(client) {
  if (!isEnabled()) {
    console.log("ℹ️ Zentralpanel Auto-Refresh deaktiviert.");
    return;
  }

  if (refreshTimer) {
    return;
  }

  const intervalMs = getRefreshIntervalMs();

  setTimeout(() => {
    refreshAllCentralPanels(client).catch(error => {
      console.error("❌ Zentralpanel Auto-Refresh Start-Refresh Fehler:", error);
    });
  }, 3000);

  refreshTimer = setInterval(() => {
    refreshAllCentralPanels(client).catch(error => {
      console.error("❌ Zentralpanel Auto-Refresh Fehler:", error);
    });
  }, intervalMs);

  console.log("🔄 Zentralpanel Auto-Refresh aktiv alle " + intervalMs + "ms");
}

module.exports = {
  startCentralPanelAutoRefresh,
  refreshAllCentralPanels,
  refreshCentralPanelInGuild
};

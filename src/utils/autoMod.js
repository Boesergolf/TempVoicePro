const {
  PermissionFlagsBits
} = require("discord.js");

const db = require("../database/mysql");

const {
  getAutoModSettings
} = require("./autoModSettings");

const {
  createModerationCase
} = require("./moderationCases");

const {
  sendModLog
} = require("./modLog");

const {
  isModuleEnabled
} = require("./guildModules");

const userMessageHistory = new Map();
const autoWarnCooldowns = new Map();

const WARN_COOLDOWN_MS = 60 * 1000;

function cleanupOldTimestamps(timestamps, intervalMs) {
  const now = Date.now();
  return timestamps.filter(timestamp => now - timestamp <= intervalMs);
}

function getHistoryKey(message) {
  return message.guild.id + ":" + message.author.id;
}

function getCooldownKey(message, violationType) {
  return message.guild.id + ":" + message.author.id + ":" + violationType;
}

function hasModeratorPermissions(message) {
  if (!message.member) {
    return false;
  }

  return message.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
    message.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    message.member.permissions.has(PermissionFlagsBits.Administrator);
}

function detectLink(content) {
  return /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/)/i.test(content);
}

function getCapsPercent(content) {
  const letters = content.replace(/[^a-zA-ZÄÖÜäöüß]/g, "");

  if (!letters.length) {
    return 0;
  }

  const upper = letters.replace(/[^A-ZÄÖÜ]/g, "");

  return Math.round((upper.length / letters.length) * 100);
}

function detectCaps(content, settings) {
  const letters = content.replace(/[^a-zA-ZÄÖÜäöüß]/g, "");

  if (letters.length < settings.capsMinLength) {
    return false;
  }

  return getCapsPercent(content) >= settings.capsPercent;
}

function detectSpam(message, settings) {
  const key = getHistoryKey(message);
  const intervalMs = settings.spamIntervalSeconds * 1000;

  const previous = userMessageHistory.get(key) || [];
  const timestamps = cleanupOldTimestamps(previous, intervalMs);

  timestamps.push(Date.now());
  userMessageHistory.set(key, timestamps);

  return timestamps.length >= settings.spamMessageLimit;
}

function canAutoWarn(message, violationType) {
  const key = getCooldownKey(message, violationType);
  const lastWarnAt = autoWarnCooldowns.get(key) || 0;
  const now = Date.now();

  if (now - lastWarnAt < WARN_COOLDOWN_MS) {
    return false;
  }

  autoWarnCooldowns.set(key, now);
  return true;
}

async function createAutoWarning(message, reason) {
  const [result] = await db.query(
    `
      INSERT INTO moderation_warnings
        (guildId, userId, moderatorId, reason, active)
      VALUES (?, ?, ?, ?, 1)
    `,
    [
      message.guild.id,
      message.author.id,
      message.client.user.id,
      reason
    ]
  );

  return {
    id: result.insertId
  };
}

async function deleteMessage(message) {
  if (!message.deletable) {
    return false;
  }

  await message.delete().catch(() => null);
  return true;
}

async function applyTimeout(message, settings, reason) {
  if (!settings.timeoutEnabled) {
    return false;
  }

  if (!message.member || !message.member.moderatable) {
    return false;
  }

  const timeoutMs = settings.timeoutMinutes * 60 * 1000;

  await message.member.timeout(
    timeoutMs,
    reason + " | Auto-Mod"
  ).catch(() => null);

  return true;
}

async function punishMessage(message, violation) {
  const settings = violation.settings;
  const reason = violation.reason;

  const deleted = await deleteMessage(message);

  let warning = null;

  if (settings.autoWarnEnabled && canAutoWarn(message, violation.type)) {
    warning = await createAutoWarning(message, reason);
  }

  const timedOut = await applyTimeout(message, settings, reason);

  const modCase = await createModerationCase({
    guildId: message.guild.id,
    actionType: "automod",
    targetId: message.author.id,
    moderatorId: message.client.user.id,
    reason,
    details: {
      violationType: violation.type,
      messageId: message.id,
      channelId: message.channel.id,
      deleted,
      warningId: warning ? warning.id : null,
      timedOut,
      timeoutMinutes: timedOut ? settings.timeoutMinutes : null
    }
  });

  await sendModLog(message.guild, {
    title: "🤖 Auto-Mod Aktion",
    color: 0xffa500,
    description: message.author.toString() + " wurde automatisch moderiert.",
    fields: [
      {
        name: "Case",
        value: "#" + modCase.id,
        inline: true
      },
      {
        name: "User",
        value: message.author.toString(),
        inline: true
      },
      {
        name: "Verstoß",
        value: violation.label,
        inline: true
      },
      {
        name: "Nachricht gelöscht",
        value: deleted ? "Ja" : "Nein",
        inline: true
      },
      {
        name: "Auto-Warn",
        value: warning ? "Warn-ID " + warning.id : "Nein",
        inline: true
      },
      {
        name: "Timeout",
        value: timedOut ? settings.timeoutMinutes + " Minuten" : "Nein",
        inline: true
      },
      {
        name: "Grund",
        value: reason
      }
    ]
  });

  return {
    deleted,
    warning,
    timedOut,
    modCase
  };
}

async function handleAutoModMessage(message) {
  if (!message.guild || !message.member) {
    return null;
  }

  if (message.author.bot || message.webhookId) {
    return null;
  }

  if (hasModeratorPermissions(message)) {
    return null;
  }

  const moderationModuleEnabled = await isModuleEnabled(
    message.guild.id,
    "moderation"
  );

  if (!moderationModuleEnabled) {
    return null;
  }

  const settings = await getAutoModSettings(message.guild.id);

  if (!settings.enabled) {
    return null;
  }

  const content = message.content || "";

  if (settings.antiLinkEnabled && detectLink(content)) {
    return punishMessage(message, {
      type: "link",
      label: "Anti-Link",
      reason: "Auto-Mod: Link erkannt",
      settings
    });
  }

  if (settings.antiCapsEnabled && detectCaps(content, settings)) {
    return punishMessage(message, {
      type: "caps",
      label: "Anti-Caps",
      reason:
        "Auto-Mod: Caps erkannt (" +
        getCapsPercent(content) +
        "% Großbuchstaben)",
      settings
    });
  }

  if (settings.antiSpamEnabled && detectSpam(message, settings)) {
    return punishMessage(message, {
      type: "spam",
      label: "Anti-Spam",
      reason:
        "Auto-Mod: Spam erkannt (" +
        settings.spamMessageLimit +
        " Nachrichten in " +
        settings.spamIntervalSeconds +
        " Sekunden)",
      settings
    });
  }

  return null;
}

module.exports = {
  handleAutoModMessage,
  detectLink,
  detectCaps,
  detectSpam,
  getCapsPercent
};

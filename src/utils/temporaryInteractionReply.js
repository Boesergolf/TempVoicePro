function getEphemeralDeleteDelayMs() {
  const value = Number(process.env.EPHEMERAL_REPLY_DELETE_MS || 15000);

  if (!Number.isFinite(value)) {
    return 15000;
  }

  return Math.max(3000, Math.min(value, 5 * 60 * 1000));
}

function scheduleEphemeralReplyDelete(interaction, delayMs = getEphemeralDeleteDelayMs()) {
  if (!interaction) {
    return;
  }

  setTimeout(async () => {
    try {
      if (!interaction.replied && !interaction.deferred) {
        return;
      }

      await interaction.deleteReply().catch(() => null);
    } catch {
      // bewusst still, weil Discord ephemerale Antworten manchmal clientseitig schon entfernt
    }
  }, delayMs);
}

async function replyTemporary(interaction, options, delayMs) {
  const payload = {
    ...options,
    flags: 64
  };

  const result = await interaction.reply(payload);

  scheduleEphemeralReplyDelete(interaction, delayMs);

  return result;
}

async function editReplyTemporary(interaction, options, delayMs) {
  const result = await interaction.editReply(options);

  scheduleEphemeralReplyDelete(interaction, delayMs);

  return result;
}

module.exports = {
  getEphemeralDeleteDelayMs,
  scheduleEphemeralReplyDelete,
  replyTemporary,
  editReplyTemporary
};

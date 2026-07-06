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
      // bewusst still
    }
  }, delayMs);
}

function isEphemeralPayload(options) {
  if (!options || typeof options !== "object") {
    return false;
  }

  if (options.ephemeral === true) {
    return true;
  }

  if (typeof options.flags === "number") {
    return (options.flags & 64) === 64;
  }

  if (Array.isArray(options.flags)) {
    return options.flags.includes(64) || options.flags.includes("Ephemeral");
  }

  return false;
}

function scheduleFollowUpDelete(message, delayMs = getEphemeralDeleteDelayMs()) {
  if (!message || typeof message.delete !== "function") {
    return;
  }

  setTimeout(async () => {
    await message.delete().catch(() => null);
  }, delayMs);
}

function installTemporaryInteractionReplyCleanup(interaction) {
  if (!interaction || interaction.__tempvoiceproTemporaryReplyCleanupInstalled) {
    return;
  }

  interaction.__tempvoiceproTemporaryReplyCleanupInstalled = true;
  interaction.__tempvoiceproEphemeralReply = false;

  const originalReply = interaction.reply ? interaction.reply.bind(interaction) : null;
  const originalDeferReply = interaction.deferReply ? interaction.deferReply.bind(interaction) : null;
  const originalEditReply = interaction.editReply ? interaction.editReply.bind(interaction) : null;
  const originalFollowUp = interaction.followUp ? interaction.followUp.bind(interaction) : null;

  if (originalReply) {
    interaction.reply = async function patchedReply(options) {
      const isEphemeral = isEphemeralPayload(options);

      if (isEphemeral) {
        interaction.__tempvoiceproEphemeralReply = true;
      }

      const result = await originalReply(options);

      if (isEphemeral) {
        scheduleEphemeralReplyDelete(interaction);
      }

      return result;
    };
  }

  if (originalDeferReply) {
    interaction.deferReply = async function patchedDeferReply(options) {
      const isEphemeral = isEphemeralPayload(options);

      if (isEphemeral) {
        interaction.__tempvoiceproEphemeralReply = true;
      }

      return originalDeferReply(options);
    };
  }

  if (originalEditReply) {
    interaction.editReply = async function patchedEditReply(options) {
      const result = await originalEditReply(options);

      if (interaction.__tempvoiceproEphemeralReply) {
        scheduleEphemeralReplyDelete(interaction);
      }

      return result;
    };
  }

  if (originalFollowUp) {
    interaction.followUp = async function patchedFollowUp(options) {
      const isEphemeral = isEphemeralPayload(options);
      const result = await originalFollowUp(options);

      if (isEphemeral) {
        scheduleFollowUpDelete(result);
      }

      return result;
    };
  }
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
  isEphemeralPayload,
  scheduleFollowUpDelete,
  installTemporaryInteractionReplyCleanup,
  replyTemporary,
  editReplyTemporary
};

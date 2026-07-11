const { MessageFlags } = require("discord.js");

function normalizeReplyOptions(options) {
  if (typeof options === "string") {
    return { content: options };
  }

  return { ...(options || {}) };
}

function withEphemeral(options) {
  const payload = normalizeReplyOptions(options);
  const flags = typeof payload.flags === "number"
    ? payload.flags | MessageFlags.Ephemeral
    : MessageFlags.Ephemeral;

  return {
    ...payload,
    flags
  };
}

async function replyEphemeral(interaction, options) {
  const payload = withEphemeral(options);

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload);
  }

  return interaction.reply(payload);
}

async function safeReplyEphemeral(interaction, options) {
  try {
    return await replyEphemeral(interaction, options);
  } catch (err) {
    console.error("❌ Reply Fehler:", err.message);
    return null;
  }
}

async function deferEphemeral(interaction) {
  if (interaction.replied || interaction.deferred) {
    return null;
  }

  return interaction.deferReply({
    flags: MessageFlags.Ephemeral
  });
}

async function editOrReplyEphemeral(interaction, options) {
  const payload = normalizeReplyOptions(options);

  if (interaction.deferred || interaction.replied) {
    try {
      return await interaction.editReply(payload);
    } catch (err) {
      if (err && err.code !== 40060 && err.code !== 10062 && err.code !== 10008) {
        throw err;
      }

      return interaction.followUp(withEphemeral(options));
    }
  }

  return interaction.reply(withEphemeral(options));
}

module.exports = {
  withEphemeral,
  replyEphemeral,
  safeReplyEphemeral,
  deferEphemeral,
  editOrReplyEphemeral
};

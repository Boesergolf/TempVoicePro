const db = require("../database/mysql");

const deleteTimers = new Map();

function getSharedPanelChannelName() {
  return process.env.TEMPVOICE_PANEL_CHANNEL_NAME || "tempvoice-panels";
}

async function isPermanentChannel(channelId) {
  if (!channelId) {
    return false;
  }

  const [rows] = await db.execute(
    "SELECT isPermanent FROM temp_channels WHERE channelId = ? LIMIT 1",
    [channelId]
  );

  return Number(rows[0]?.isPermanent || 0) === 1;
}

async function deletePanelChannel(channel) {
  try {
    const [rows] = await db.execute(
      "SELECT panelChannelId, panelMessageId FROM temp_channels WHERE channelId = ?",
      [channel.id]
    );

    const data = rows[0];

    if (!data || !data.panelChannelId) {
      return;
    }

    const panelChannel = await channel.guild.channels
      .fetch(data.panelChannelId)
      .catch(() => null);

    if (!panelChannel || !panelChannel.isTextBased()) {
      return;
    }

    if (data.panelMessageId) {
      const panelMessage = await panelChannel.messages
        .fetch(data.panelMessageId)
        .catch(() => null);

      if (panelMessage) {
        await panelMessage.delete().catch(() => {});
        console.log("🗑️ TempVoice Panel-Nachricht gelöscht.");
      }
    }

    const sharedName = getSharedPanelChannelName();

    if (
      panelChannel.name !== sharedName &&
      panelChannel.name.startsWith("panel-")
    ) {
      await panelChannel.delete().catch(() => {});
      console.log("🧹 Alter einzelner TempVoice Panel-Channel gelöscht:", panelChannel.name);
    }
  } catch (err) {
    console.error("❌ Fehler beim Löschen der TempVoice Panel-Nachricht:", err);
  }
}

async function deleteTempChannel(channel) {
  if (!channel) return;

  try {
    cancelDelete(channel.id);

    await deletePanelChannel(channel);
    await channel.delete().catch(() => {});

    await db.execute(
      "DELETE FROM temp_channels WHERE channelId = ?",
      [channel.id]
    );

    await db.execute(
      "DELETE FROM temp_permissions WHERE channelId = ?",
      [channel.id]
    );

    console.log("🗑️ TempVoice Channel gelöscht:", channel.name);
  } catch (err) {
    console.error("❌ Fehler beim Löschen des TempVoice Channels:", err);
  }
}

function handleEmptyChannel(channel) {
  if (!channel) return;
  if (deleteTimers.has(channel.id)) return;

  const timer = setTimeout(async () => {
    try {
      if (await isPermanentChannel(channel.id)) {
        console.log("📌 Permanenter TempVoice bleibt bestehen:", channel.name);
        return;
      }

      if (channel.members && channel.members.size === 0) {
        await deleteTempChannel(channel);
      }
    } catch (err) {
      console.error("❌ Delete error:", err);
    } finally {
      deleteTimers.delete(channel.id);
    }
  }, 10_000);

  deleteTimers.set(channel.id, timer);
}

function cancelDelete(channelId) {
  if (deleteTimers.has(channelId)) {
    clearTimeout(deleteTimers.get(channelId));
    deleteTimers.delete(channelId);
  }
}

module.exports = {
  handleEmptyChannel,
  cancelDelete,
  deleteTempChannel,
  isPermanentChannel
};

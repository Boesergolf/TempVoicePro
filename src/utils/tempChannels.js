const db = require("../database/mysql");

const deleteTimers = new Map();

async function deletePanelChannel(channel) {
  try {
    const [rows] = await db.execute(
      "SELECT panelChannelId FROM temp_channels WHERE channelId = ?",
      [channel.id]
    );

    const data = rows[0];

    if (!data || !data.panelChannelId) {
      return;
    }

    const panelChannel = await channel.guild.channels
      .fetch(data.panelChannelId)
      .catch(() => null);

    if (panelChannel) {
      await panelChannel.delete().catch(() => {});
      console.log("🗑️ Temporärer Panel-Textkanal gelöscht.");
    }
  } catch (err) {
    console.error("❌ Fehler beim Löschen des Panel-Textkanals:", err);
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
      if (channel.members.size === 0) {
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
  deleteTempChannel
};

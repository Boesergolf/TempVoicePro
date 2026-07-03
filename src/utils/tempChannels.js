const db = require("../database/mysql");

const deleteTimers = new Map();

function handleEmptyChannel(channel) {
  if (!channel) return;

  if (deleteTimers.has(channel.id)) return;

  const timer = setTimeout(async () => {
    try {
      const members = channel.members.size;

      // nur löschen wenn immer noch leer
      if (members === 0) {
        await channel.delete().catch(() => {});
        await db.execute("DELETE FROM temp_channels WHERE channelId = ?", [
          channel.id
        ]);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }, 10_000); // 10 Sekunden Test (später 60s+)

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
  cancelDelete
};
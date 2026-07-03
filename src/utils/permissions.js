const db = require("../database/mysql");

async function hasAccess(userId, channelId) {
  const [rows] = await db.execute(
    "SELECT * FROM temp_permissions WHERE channelId = ?",
    [channelId]
  );

  const data = rows[0];
  if (!data) return false;

  const coOwners = JSON.parse(data.coOwners || "[]");

  return data.ownerId === userId || coOwners.includes(userId);
}

module.exports = { hasAccess };
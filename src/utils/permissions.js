const db = require("../database/mysql");

async function hasAccess(userId, channelId) {
  const [rows] = await db.execute(
    "SELECT * FROM temp_permissions WHERE channelId = ?",
    [channelId]
  );

  const data = rows[0];
  if (!data) return false;

  let coOwners = [];

  try {
    coOwners = JSON.parse(data.coOwners || "[]");
  } catch {
    coOwners = [];
  }

  return data.ownerId === userId || coOwners.includes(userId);
}

async function isOwner(userId, channelId) {
  const [rows] = await db.execute(
    "SELECT * FROM temp_permissions WHERE channelId = ?",
    [channelId]
  );

  const data = rows[0];
  if (!data) return false;

  return data.ownerId === userId;
}

module.exports = {
  hasAccess,
  isOwner
};

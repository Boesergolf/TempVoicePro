const cooldowns = new Map();

function checkCooldown(userId) {
  const now = Date.now();
  const last = cooldowns.get(userId);

  if (last && now - last < 5000) return false;

  cooldowns.set(userId, now);
  return true;
}

module.exports = { checkCooldown };
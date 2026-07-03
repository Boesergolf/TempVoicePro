module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`✅ Eingeloggt als ${client.user.tag}`);
  }
};
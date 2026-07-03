const { EmbedBuilder } = require("discord.js");

function log(client, message) {
  const channel = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("📜 TempVoice Log")
    .setDescription(message)
    .setColor("Orange")
    .setTimestamp();

  channel.send({ embeds: [embed] });
}

module.exports = { log };
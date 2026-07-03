const db = require("../database/db");

module.exports = {
  customId: "tv_coowner",

  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel)
      return interaction.reply({ content: "❌ Kein Channel", ephemeral: true });

    const userId = interaction.user.id;

    const data = db.prepare(
      "SELECT * FROM temp_permissions WHERE channelId = ?"
    ).get(channel.id);

    if (!data || data.ownerId !== userId) {
      return interaction.reply({
        content: "🚫 Nur Owner darf Co-Owner verwalten",
        ephemeral: true
      });
    }

    // Demo: einfach Selbst-Add (später Modal erweitern)
    let coOwners = JSON.parse(data.coOwners || "[]");

    if (!coOwners.includes(userId)) {
      coOwners.push(userId);
    }

    db.prepare(`
      UPDATE temp_permissions
      SET coOwners = ?
      WHERE channelId = ?
    `).run(JSON.stringify(coOwners), channel.id);

    return interaction.reply({
      content: "⭐ Co-Owner aktualisiert",
      ephemeral: true
    });
  }
};

const { hasAccess } = require("../utils/permissions");

module.exports = {
  customId: "tv_lock",

  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel) return;

    const allowed = await hasAccess(interaction.user.id, channel.id);

    if (!allowed) {
      return interaction.reply({
        content: "❌ Kein Zugriff (Owner/CoOwner only)",
        ephemeral: true
      });
    }

    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { Connect: false }
    );

    return interaction.reply({
      content: "🔒 Locked",
      ephemeral: true
    });
  }
};

const { checkCooldown } = require("../utils/cooldown");

if (!checkCooldown(interaction.user.id, "tv_lock")) {
  return interaction.reply({
    content: "⏳ Cooldown aktiv",
    ephemeral: true
  });
}
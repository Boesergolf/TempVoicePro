const { MessageFlags } = require("discord.js");

const {
  updateGuildPanels
} = require("../utils/panelAutoRefresh");

const cooldowns = new Map();

function getCooldownMs() {
  const value = Number(process.env.PANEL_REFRESH_BUTTON_COOLDOWN_MS || 10000);

  if (Number.isNaN(value) || value < 3000) {
    return 10000;
  }

  return value;
}

module.exports = {
  customId: "panel_refresh",

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const guildId = interaction.guild.id;
    const now = Date.now();
    const cooldownMs = getCooldownMs();
    const lastUsed = cooldowns.get(guildId) || 0;
    const remaining = cooldownMs - (now - lastUsed);

    if (remaining > 0) {
      const seconds = Math.ceil(remaining / 1000);

      return interaction.editReply(
        "⏳ Bitte warte noch **" + seconds + " Sekunden**, bevor du die Panels erneut aktualisierst."
      );
    }

    cooldowns.set(guildId, now);

    try {
      await updateGuildPanels(interaction.guild);

      return interaction.editReply(
        "✅ Panels wurden aktualisiert."
      );
    } catch (err) {
      console.error("❌ Panel Refresh Button Fehler:", err.message);

      return interaction.editReply(
        "❌ Panels konnten nicht aktualisiert werden."
      );
    }
  }
};

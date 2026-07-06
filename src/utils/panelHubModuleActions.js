const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const {
  isModuleEnabled,
  setModuleEnabled
} = require("./guildModules");

const MODULE_LABELS = {
  tempvoice: "🎙️ TempVoice",
  music: "🎵 Music",
  playlist: "🎚️ Playlist",
  gluecksrad: "🎡 Glücksrad",
  panels: "🧭 Panels",
  chatgpt: "🤖 ChatGPT",
  moderation: "🛡️ Moderation",
  leveling: "⭐ Leveling",
  tickets: "🎫 Tickets"
};

function getModuleLabel(moduleName) {
  return MODULE_LABELS[moduleName] || moduleName;
}

function createModuleSelectedMessage(moduleName, enabled) {
  const embed = new EmbedBuilder()
    .setTitle("🧩 Modul ausgewählt")
    .setDescription(
      [
        "Modul: **" + getModuleLabel(moduleName) + "**",
        "Status: " + (enabled ? "✅ Aktiviert" : "❌ Deaktiviert"),
        "",
        "Wähle unten, was du tun möchtest."
      ].join("\n")
    )
    .setColor(enabled ? 0x22c55e : 0xef4444)
    .setFooter({ text: "TempVoicePro Module" })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_hub_module_enable:" + moduleName)
      .setLabel("Aktivieren")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("panel_hub_module_disable:" + moduleName)
      .setLabel("Deaktivieren")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_hub_modules")
      .setLabel("Zurück zu Module")
      .setEmoji("🧩")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_hub_home")
      .setLabel("Zurück zum Kontrollzentrum")
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row1, row2]
  };
}

async function handlePanelHubModuleSelect(interaction) {
  const moduleName = interaction.values[0];
  const enabled = await isModuleEnabled(interaction.guild.id, moduleName);

  return interaction.update(createModuleSelectedMessage(moduleName, enabled));
}

async function handlePanelHubModuleButton(interaction) {
  const [action, moduleName] = interaction.customId
    .replace("panel_hub_module_", "")
    .split(":");

  if (!moduleName) {
    return interaction.reply({
      content: "❌ Modul konnte nicht erkannt werden.",
      flags: 64
    });
  }

  const enabled = action === "enable";

  await setModuleEnabled(interaction.guild.id, moduleName, enabled);

  return interaction.update(createModuleSelectedMessage(moduleName, enabled));
}

module.exports = {
  handlePanelHubModuleSelect,
  handlePanelHubModuleButton
};

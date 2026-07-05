const {
  MessageFlags,
  PermissionFlagsBits
} = require("discord.js");

const {
  getKnownModules,
  setModuleEnabled
} = require("./guildModules");

const {
  updateGuildPanels
} = require("./panelAutoRefresh");

const selectedModules = new Map();

function getSelectionKey(interaction) {
  return interaction.guild.id + ":" + interaction.user.id;
}

function getModuleLabel(moduleKey) {
  const info = getKnownModules()[moduleKey];

  if (!info) {
    return moduleKey;
  }

  return info.name;
}

function canManageModules(interaction) {
  return interaction.memberPermissions &&
    interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
}

async function denyNoPermission(interaction) {
  return interaction.reply({
    content: "❌ Du brauchst die Berechtigung **Server verwalten**, um Module zu ändern.",
    flags: MessageFlags.Ephemeral
  });
}

async function handleModuleSelect(interaction) {
  if (!canManageModules(interaction)) {
    return denyNoPermission(interaction);
  }

  const moduleKey = interaction.values[0];
  const knownModules = getKnownModules();

  if (!knownModules[moduleKey]) {
    return interaction.reply({
      content: "❌ Unbekanntes Modul.",
      flags: MessageFlags.Ephemeral
    });
  }

  selectedModules.set(getSelectionKey(interaction), moduleKey);

  return interaction.reply({
    content:
      "🧩 Ausgewähltes Modul: **" + getModuleLabel(moduleKey) + "** `" + moduleKey + "`\n\n" +
      "Nutze jetzt den Button **Aktivieren** oder **Deaktivieren**.",
    flags: MessageFlags.Ephemeral
  });
}

async function handleModuleButton(interaction, enabled) {
  if (!canManageModules(interaction)) {
    return denyNoPermission(interaction);
  }

  const moduleKey = selectedModules.get(getSelectionKey(interaction));

  if (!moduleKey) {
    return interaction.reply({
      content: "❌ Bitte wähle zuerst ein Modul im Dropdown aus.",
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral
  });

  const result = await setModuleEnabled(
    interaction.guild.id,
    moduleKey,
    enabled
  );

  await updateGuildPanels(interaction.guild).catch(err => {
    console.error("❌ Module Panel Button Refresh Fehler:", err.message);
  });

  return interaction.editReply(
    (result.enabled ? "✅ Aktiviert: " : "❌ Deaktiviert: ") +
    "**" + getModuleLabel(result.key) + "** `" + result.key + "`"
  );
}

module.exports = {
  handleModuleSelect,
  handleModuleButton
};

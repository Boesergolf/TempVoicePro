function getComponentIds(message) {
  const ids = [];

  for (const row of message.components || []) {
    for (const component of row.components || []) {
      if (component.customId) {
        ids.push(component.customId);
      }
    }
  }

  return ids;
}

function isCentralPanelMessage(message, botId) {
  if (!message || !message.author || message.author.id !== botId) {
    return false;
  }

  const embed = message.embeds && message.embeds[0];
  const title = embed && embed.title ? embed.title : "";
  const footer = embed && embed.footer && embed.footer.text ? embed.footer.text : "";
  const componentIds = getComponentIds(message);

  if (componentIds.some(id => id.startsWith("panel_hub_"))) {
    return true;
  }

  const knownTitles = [
    "TempVoicePro Kontrollzentrum",
    "Musiksteuerung",
    "Playlist-Verwaltung",
    "TempVoice",
    "Glücksrad",
    "Module",
    "Panel-Channel aufräumen",
    "Hilfe zum Zentralpanel"
  ];

  const knownFooters = [
    "TempVoicePro Zentralpanel",
    "TempVoicePro Panel Hub",
    "TempVoicePro Musik",
    "TempVoicePro Playlist Panel",
    "TempVoicePro TempVoice",
    "TempVoicePro Glücksrad",
    "TempVoicePro Module",
    "TempVoicePro Panel Ordnung",
    "TempVoicePro Hilfe"
  ];

  return knownTitles.some(value => title.includes(value)) ||
    knownFooters.some(value => footer.includes(value));
}

async function findCentralPanelMessage(channel, botId) {
  const messages = await channel.messages.fetch({
    limit: 100
  });

  const centralPanels = messages
    .filter(message => isCentralPanelMessage(message, botId))
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  return centralPanels.first() || null;
}

async function updateOrCreateCentralPanel(interaction, viewMessage) {
  const botId = interaction.client.user.id;
  const existingPanel = await findCentralPanelMessage(interaction.channel, botId);

  if (existingPanel) {
    await existingPanel.edit(viewMessage);

    return {
      created: false,
      message: existingPanel
    };
  }

  const message = await interaction.channel.send(viewMessage);

  return {
    created: true,
    message
  };
}

async function replyWithCentralPanelView(interaction, viewMessage, label) {
  await interaction.reply({
    content: "🧭 Zentralpanel wird aktualisiert...",
    flags: 64
  });

  const result = await updateOrCreateCentralPanel(interaction, viewMessage);

  return interaction.editReply({
    content:
      result.created
        ? "✅ Zentralpanel wurde erstellt: **" + label + "**"
        : "✅ Zentralpanel wurde umgeschaltet auf: **" + label + "**"
  });
}

module.exports = {
  isCentralPanelMessage,
  findCentralPanelMessage,
  updateOrCreateCentralPanel,
  replyWithCentralPanelView
};

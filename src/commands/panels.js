const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} = require("discord.js");

const {
  getOrCreatePanelChannel,
  findPanelMessage,
  cleanupDuplicatePanelMessages,
  getPanelMessageDeleteMs,
  pinPanelMessage
} = require("../utils/panelChannel");

const {
  createMusicPanelEmbed,
  createMusicPanelRows
} = require("../utils/musicPanelView");

const {
  createLuckWheelPanelEmbed,
  createLuckWheelPanelRows
} = require("../utils/luckWheel");

const {
  createTempVoicePanelEmbed
} = require("../utils/tempVoicePanelView");

function createOverviewEmbed() {
  const seconds = Math.round(getPanelMessageDeleteMs() / 1000);

  return new EmbedBuilder()
    .setTitle("📌 TempVoicePro Panels")
    .setColor("Blue")
    .setDescription(
      "Dieser Channel enthält die zentralen Bot-Panels.\n\n" +
      "Normale Nachrichten in diesem Channel werden automatisch nach **" + seconds + " Sekunden** gelöscht.\n" +
      "Die Panels bleiben erhalten."
    )
    .addFields(
      {
        name: "🎵 Music Player",
        value: "Musik steuern, Queue anzeigen, Loop, History, Favorites und mehr."
      },
      {
        name: "🎡 Glücksrad",
        value: "Maps, Karten, Voice-Mitglieder oder Teams zufällig auswählen."
      }
    )
    .setFooter({
      text: "TempVoicePro Panel Channel"
    })
    .setTimestamp();
}

async function upsertPanel(channel, botId, titlePart, payload) {
  const existing = await findPanelMessage(channel, botId, titlePart);

  if (existing) {
    await existing.edit(payload);
    await pinPanelMessage(existing);
    await cleanupDuplicatePanelMessages(channel, botId, titlePart, existing.id);
    return existing;
  }

  const message = await channel.send(payload);
  await pinPanelMessage(message);
  await cleanupDuplicatePanelMessages(channel, botId, titlePart, message.id);
  return message;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panels")
    .setDescription("Erstellt oder aktualisiert alle zentralen Bot-Panels")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName("kategorie")
        .setDescription("In welcher Kategorie soll der Panel-Channel erstellt oder verschoben werden?")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildCategory)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const category = interaction.options.getChannel("kategorie");
    const channel = await getOrCreatePanelChannel(interaction.guild, category.id);
    const botId = interaction.client.user.id;

    await upsertPanel(channel, botId, "TempVoicePro Panels", {
      embeds: [createOverviewEmbed()],
      components: []
    });

    await upsertPanel(channel, botId, "TempVoice Status", {
      embeds: [await createTempVoicePanelEmbed(interaction.guild)],
      components: []
    });

    await upsertPanel(channel, botId, "Music Player", {
      embeds: [createMusicPanelEmbed(interaction.guild.id)],
      components: createMusicPanelRows()
    });

    await upsertPanel(channel, botId, "Glücksrad Panel", {
      embeds: [createLuckWheelPanelEmbed()],
      components: createLuckWheelPanelRows()
    });

    return interaction.editReply(
      "✅ Alle Panels wurden erstellt oder aktualisiert in " + channel.toString() +
      "\n📁 Kategorie: **" + category.name + "**"
    );
  }
};

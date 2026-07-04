const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

function parseEntries(text) {
  return String(text || "")
    .split(/[\n,;|]+/)
    .map(entry => entry.trim())
    .filter(Boolean);
}

function uniqueEntries(entries) {
  const seen = new Set();
  const result = [];

  for (const entry of entries) {
    const key = entry.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }

  return result;
}

function shuffle(entries) {
  const pool = [...entries];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  return pool;
}

function pickRandom(entries, amount) {
  return shuffle(entries).slice(0, amount);
}

function cleanText(text, max = 1000) {
  const value = String(text || "Keine Daten.").trim();

  if (value.length <= max) {
    return value;
  }

  return value.slice(0, max - 20) + "\n... gekürzt";
}

function formatList(entries) {
  return entries
    .map((entry, index) => (index + 1) + ". " + entry)
    .join("\n");
}

function createWheelEmbed(title, entries, winners, user) {
  return new EmbedBuilder()
    .setTitle("🎡 " + title)
    .setColor(0xf1c40f)
    .setDescription(
      "Das Glücksrad wurde gedreht.\n\n" +
      "🎯 **Auswahl:**\n" +
      cleanText(formatList(winners), 1000)
    )
    .addFields({
      name: "📋 Teilnehmer",
      value: cleanText(
        entries.length <= 25
          ? formatList(entries)
          : formatList(entries.slice(0, 25)) + "\n... und " + (entries.length - 25) + " weitere",
        1000
      )
    })
    .setFooter({
      text: "Gedreht von " + user.tag
    })
    .setTimestamp();
}

function createTeamEmbed(title, teams, user) {
  const embed = new EmbedBuilder()
    .setTitle("👥 " + title)
    .setColor(0x3498db)
    .setDescription("Die Teams wurden zufällig erstellt.")
    .setFooter({
      text: "Erstellt von " + user.tag
    })
    .setTimestamp();

  teams.forEach((team, index) => {
    embed.addFields({
      name: "Team " + (index + 1),
      value: team.length > 0 ? cleanText(team.join("\n"), 1000) : "Leer"
    });
  });

  return embed;
}

function getVoiceMembers(interaction) {
  const voiceChannel = interaction.member?.voice?.channel;

  if (!voiceChannel) {
    return null;
  }

  return [...voiceChannel.members.values()]
    .filter(member => !member.user.bot);
}

function createTeams(members, teamCount) {
  const shuffled = shuffle(members);
  const teams = Array.from({ length: teamCount }, () => []);

  shuffled.forEach((member, index) => {
    teams[index % teamCount].push(member.toString());
  });

  return teams;
}

function createLuckWheelPanelEmbed() {
  return new EmbedBuilder()
    .setTitle("🎡 Glücksrad Panel")
    .setColor(0xf1c40f)
    .setDescription(
      "Wähle per Dropdown eine Aktion aus oder nutze den Button für eine eigene Liste.\n\n" +
      "Perfekt für nächste Karte, Team-Auswahl oder zufällige Spieler."
    )
    .addFields(
      {
        name: "🎙 Voice Auswahl",
        value: "Wählt zufällige Mitglieder aus deinem aktuellen Voice Channel."
      },
      {
        name: "👥 Teams",
        value: "Bildet zufällige Teams aus deinem aktuellen Voice Channel."
      },
      {
        name: "🎡 Eigene Liste",
        value: "Dreht aus frei eingegebenen Einträgen, z. B. Maps oder Karten."
      }
    )
    .setFooter({
      text: "TempVoicePro Glücksrad"
    })
    .setTimestamp();
}

function createLuckWheelPanelRows() {
  const select = new StringSelectMenuBuilder()
    .setCustomId("gr_select")
    .setPlaceholder("🎡 Glücksrad Aktion auswählen")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("1 Mitglied aus Voice wählen")
        .setDescription("Wählt 1 zufälliges Mitglied aus deinem Voice Channel")
        .setValue("voice_pick_1")
        .setEmoji("🎙"),

      new StringSelectMenuOptionBuilder()
        .setLabel("2 Mitglieder aus Voice wählen")
        .setDescription("Wählt 2 zufällige Mitglieder aus deinem Voice Channel")
        .setValue("voice_pick_2")
        .setEmoji("🎙"),

      new StringSelectMenuOptionBuilder()
        .setLabel("3 Mitglieder aus Voice wählen")
        .setDescription("Wählt 3 zufällige Mitglieder aus deinem Voice Channel")
        .setValue("voice_pick_3")
        .setEmoji("🎙"),

      new StringSelectMenuOptionBuilder()
        .setLabel("2 Teams bilden")
        .setDescription("Bildet 2 zufällige Teams aus deinem Voice Channel")
        .setValue("voice_team_2")
        .setEmoji("👥"),

      new StringSelectMenuOptionBuilder()
        .setLabel("3 Teams bilden")
        .setDescription("Bildet 3 zufällige Teams aus deinem Voice Channel")
        .setValue("voice_team_3")
        .setEmoji("👥")
    );

  const row1 = new ActionRowBuilder().addComponents(select);

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gr_list")
      .setLabel("🎡 Eigene Liste drehen")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("gr_help")
      .setLabel("❓ Hilfe")
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

function showListModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("gr_list_modal")
    .setTitle("Glücksrad aus eigener Liste");

  const title = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Titel")
    .setPlaceholder("Nächste Karte")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const amount = new TextInputBuilder()
    .setCustomId("amount")
    .setLabel("Anzahl Gewinner")
    .setPlaceholder("1")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const entries = new TextInputBuilder()
    .setCustomId("entries")
    .setLabel("Einträge")
    .setPlaceholder("Inferno, Mirage, Dust2, Nuke")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(amount),
    new ActionRowBuilder().addComponents(entries)
  );

  return interaction.showModal(modal);
}

async function handleListModal(interaction) {
  await interaction.deferReply();

  const title = interaction.fields.getTextInputValue("title") || "Glücksrad";
  const amountRaw = interaction.fields.getTextInputValue("amount") || "1";
  const entriesRaw = interaction.fields.getTextInputValue("entries");

  const amount = Number.parseInt(amountRaw, 10);
  const entries = uniqueEntries(parseEntries(entriesRaw));

  if (entries.length < 2) {
    return interaction.editReply("❌ Bitte gib mindestens **2 Einträge** an.");
  }

  if (Number.isNaN(amount) || amount < 1) {
    return interaction.editReply("❌ Bitte gib eine gültige Gewinner-Anzahl ein.");
  }

  if (amount > entries.length) {
    return interaction.editReply(
      "❌ Du willst **" + amount + "** Gewinner auswählen, aber es gibt nur **" + entries.length + "** Einträge."
    );
  }

  const winners = pickRandom(entries, amount);

  return interaction.editReply({
    embeds: [createWheelEmbed(title, entries, winners, interaction.user)]
  });
}

async function handleWheelSelect(interaction) {
  await interaction.deferReply();

  const value = interaction.values[0];
  const members = getVoiceMembers(interaction);

  if (!members) {
    return interaction.editReply("❌ Du musst in einem Voice Channel sein.");
  }

  if (members.length < 2) {
    return interaction.editReply("❌ Im Voice Channel müssen mindestens **2 Mitglieder** sein.");
  }

  if (value.startsWith("voice_pick_")) {
    const amount = Number.parseInt(value.replace("voice_pick_", ""), 10);

    if (amount > members.length) {
      return interaction.editReply(
        "❌ Es gibt nur **" + members.length + "** passende Mitglieder im Voice Channel."
      );
    }

    const entries = members.map(member => member.user.tag);
    const winners = pickRandom(members, amount).map(member => member.toString());

    return interaction.editReply({
      embeds: [createWheelEmbed("Voice Auswahl", entries, winners, interaction.user)]
    });
  }

  if (value.startsWith("voice_team_")) {
    const teamCount = Number.parseInt(value.replace("voice_team_", ""), 10);

    if (members.length < teamCount) {
      return interaction.editReply(
        "❌ Für **" + teamCount + "** Teams brauche ich mindestens **" + teamCount + "** Mitglieder."
      );
    }

    const teams = createTeams(members, teamCount);

    return interaction.editReply({
      embeds: [createTeamEmbed(teamCount + " Teams", teams, interaction.user)]
    });
  }

  return interaction.editReply("❌ Unbekannte Glücksrad-Auswahl.");
}

module.exports = {
  createLuckWheelPanelEmbed,
  createLuckWheelPanelRows,
  showListModal,
  handleListModal,
  handleWheelSelect
};

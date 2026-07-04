const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
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

function pickRandom(entries, amount) {
  const pool = [...entries];
  const winners = [];

  while (pool.length > 0 && winners.length < amount) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }

  return winners;
}

function formatList(entries) {
  return entries
    .map((entry, index) => (index + 1) + ". " + entry)
    .join("\n");
}

function createWheelEmbed(title, entries, winners, user) {
  return new EmbedBuilder()
    .setTitle("🎡 " + title)
    .setColor("Random")
    .setDescription(
      "Das Glücksrad wurde gedreht.\n\n" +
      "🎯 **Gewinner:**\n" +
      formatList(winners)
    )
    .addFields(
      {
        name: "📋 Teilnehmer",
        value: entries.length <= 25
          ? formatList(entries)
          : formatList(entries.slice(0, 25)) + "\n... und " + (entries.length - 25) + " weitere"
      }
    )
    .setFooter({
      text: "Gedreht von " + user.tag
    })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gluecksrad")
    .setDescription("Zufällige Auswahl für Maps, Karten oder Team-Mitglieder")
    .addSubcommand(subcommand =>
      subcommand
        .setName("liste")
        .setDescription("Wählt zufällig aus einer eigenen Liste")
        .addStringOption(option =>
          option
            .setName("eintraege")
            .setDescription("Einträge getrennt mit Komma, Semikolon oder neuer Zeile")
            .setRequired(true)
            .setMaxLength(1500)
        )
        .addIntegerOption(option =>
          option
            .setName("anzahl")
            .setDescription("Wie viele Gewinner sollen ausgewählt werden?")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20)
        )
        .addStringOption(option =>
          option
            .setName("titel")
            .setDescription("Titel für das Glücksrad")
            .setRequired(false)
            .setMaxLength(80)
        )
        .addBooleanOption(option =>
          option
            .setName("oeffentlich")
            .setDescription("Soll das Ergebnis für alle sichtbar sein?")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("voice")
        .setDescription("Wählt zufällig Mitglieder aus deinem aktuellen Voice Channel")
        .addIntegerOption(option =>
          option
            .setName("anzahl")
            .setDescription("Wie viele Mitglieder sollen ausgewählt werden?")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20)
        )
        .addBooleanOption(option =>
          option
            .setName("bots")
            .setDescription("Sollen Bots mit ausgewählt werden?")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("titel")
            .setDescription("Titel für das Glücksrad")
            .setRequired(false)
            .setMaxLength(80)
        )
        .addBooleanOption(option =>
          option
            .setName("oeffentlich")
            .setDescription("Soll das Ergebnis für alle sichtbar sein?")
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const amount = interaction.options.getInteger("anzahl") || 1;
    const title = interaction.options.getString("titel") || "Glücksrad";
    const publicAnswer = interaction.options.getBoolean("oeffentlich") ?? true;

    const replyOptions = {};

    if (!publicAnswer) {
      replyOptions.flags = MessageFlags.Ephemeral;
    }

    await interaction.deferReply(replyOptions);

    if (subcommand === "liste") {
      const rawEntries = interaction.options.getString("eintraege");
      const entries = uniqueEntries(parseEntries(rawEntries));

      if (entries.length < 2) {
        return interaction.editReply(
          "❌ Bitte gib mindestens **2 Einträge** an.\n\n" +
          "Beispiel:\n" +
          "`/gluecksrad liste eintraege: Map 1, Map 2, Map 3`"
        );
      }

      if (amount > entries.length) {
        return interaction.editReply(
          "❌ Du willst **" + amount + "** Gewinner auswählen, aber es gibt nur **" + entries.length + "** Einträge."
        );
      }

      const winners = pickRandom(entries, amount);
      const embed = createWheelEmbed(title, entries, winners, interaction.user);

      return interaction.editReply({
        embeds: [embed]
      });
    }

    if (subcommand === "voice") {
      const voiceChannel = interaction.member?.voice?.channel;

      if (!voiceChannel) {
        return interaction.editReply(
          "❌ Du musst in einem Voice Channel sein, damit ich daraus Mitglieder auswählen kann."
        );
      }

      const includeBots = interaction.options.getBoolean("bots") ?? false;

      let members = [...voiceChannel.members.values()];

      if (!includeBots) {
        members = members.filter(member => !member.user.bot);
      }

      if (members.length < 2) {
        return interaction.editReply(
          "❌ Im Voice Channel müssen mindestens **2 Mitglieder** sein."
        );
      }

      if (amount > members.length) {
        return interaction.editReply(
          "❌ Du willst **" + amount + "** Mitglieder auswählen, aber es gibt nur **" + members.length + "** passende Mitglieder im Voice Channel."
        );
      }

      const entries = members.map(member => member.user.tag);
      const pickedMembers = pickRandom(members, amount);
      const winners = pickedMembers.map(member => member.toString());

      const embed = createWheelEmbed(title, entries, winners, interaction.user);

      return interaction.editReply({
        embeds: [embed]
      });
    }

    return interaction.editReply("❌ Unbekannter Glücksrad-Modus.");
  }
};

const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

function field(name, lines) {
  return {
    name,
    value: Array.isArray(lines) ? lines.join("\n") : String(lines)
  };
}

function makeEmbed(title, description, fields, color) {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor(color || 0x3498db)
    .setDescription(description)
    .addFields(fields)
    .setFooter({
      text: "TempVoicePro Hilfe"
    })
    .setTimestamp();
}

function overviewHelp() {
  return makeEmbed(
    "📘 TempVoicePro Hilfe",
    "Wähle eine Kategorie mit `/help kategorie:...` aus.",
    [
      field("📌 Panels", [
        "`/panels` - alle zentralen Bot-Panels erstellen",
        "`/musicpanel` - Music Panel aktualisieren",
        "`/gluecksradpanel` - Glücksrad Panel aktualisieren",
        "`/panelcleanup` - alte Einzel-Panel-Channels finden",
        "`/panelcheck` - Panel-Rechte prüfen",
        "`/module` - Module pro Server verwalten",
        "`/modlog` - Moderation Log verwalten",
        "`/warn` - User verwarnen",
        "`/warnings` - Warns anzeigen",
        "`/clearwarnings` - Warns löschen",
        "`/timeout` - User timeouten",
        "`/untimeout` - Timeout entfernen",
        "`/kick` - User kicken",
        "`/ban` - User bannen",
        "`/unban` - User entbannen"
      ]),
      field("🎧 TempVoice", [
        "`/setup`, `/stats`, `/lock`, `/unlock`, `/rename`",
        "`/addcoowner`, `/removecoowner`"
      ]),
      field("🎵 Musik", [
        "`/music play`, `/music playlist`, `/music queue`",
        "`/music pause`, `/music resume`, `/music skip`, `/music stop`",
        "`/music clear`, `/music shuffle`, `/music remove`, `/music volume`"
      ]),
      field("🎡 Glücksrad", [
        "`/gluecksrad liste` - eigene Liste drehen",
        "`/gluecksrad voice` - Voice Mitglieder auswählen",
        "`/gluecksradpanel` - Panel mit Dropdown und Buttons"
      ]),
      field("🤖 ChatGPT", [
        "`/chatgpt` - ChatGPT eine Frage stellen"
      ])
    ],
    0x3498db
  );
}

function panelsHelp() {
  return makeEmbed(
    "📌 Panel Hilfe",
    "Zentrale Panels werden im Channel `#bot-panels` angezeigt.",
    [
      field("/panels kategorie:...", [
        "Erstellt oder aktualisiert alle zentralen Panels.",
        "Die Kategorie muss direkt beim Command ausgewählt werden.",
        "Normale Nachrichten im Panel-Channel werden automatisch gelöscht."
      ]),
      field("/musicpanel kategorie:...", [
        "Aktualisiert das Music Panel im zentralen Panel-Channel."
      ]),
      field("/gluecksradpanel kategorie:...", [
        "Aktualisiert das Glücksrad Panel im zentralen Panel-Channel."
      ]),
      field("Panel Auto-Refresh", [
        "TempVoice Status, Bot Status und Music Player Panel aktualisieren sich automatisch.",
        "Standard: alle 30 Sekunden.",
        "Einstellung in `.env`: `PANEL_AUTO_REFRESH_MS=30000`"
      ]),
      field("Refresh-Button", [
        "Im Übersichts-Panel gibt es den Button `🔄 Panels aktualisieren`.",
        "Damit können Bot Status, TempVoice Status und Music Player sofort aktualisiert werden."
      ]),
      field("Refresh-Cooldown", [
        "Der Refresh-Button hat standardmäßig 10 Sekunden Cooldown pro Server.",
        "Einstellung in `.env`: `PANEL_REFRESH_BUTTON_COOLDOWN_MS=10000`"
      ]),
      field("/panelcleanup", [
        "Findet alte einzelne Panel-Channels wie `#music-player` oder `#gluecksrad`.",
        "Mit `/panelcleanup loeschen:Ja` können diese alten Channels entfernt werden."
      ])
    ],
    0x2f80ed
  );
}

function tempvoiceHelp() {
  return makeEmbed(
    "🎧 TempVoice Hilfe",
    "Diese Befehle verwalten temporäre Voice Channels.",
    [
      field("/setup", "Richtet das TempVoice System ein."),
      field("/stats", "Zeigt Statistiken zum TempVoice System."),
      field("/lock", "Sperrt deinen aktuellen TempVoice Channel."),
      field("/unlock", "Entsperrt deinen aktuellen TempVoice Channel."),
      field("/rename name:...", "Benennt deinen aktuellen TempVoice Channel um."),
      field("/addcoowner user:@User", "Fügt einen Co-Owner hinzu."),
      field("/removecoowner user:@User", "Entfernt einen Co-Owner.")
    ],
    0x2ecc71
  );
}

function musicHelp() {
  return makeEmbed(
    "🎵 Musik Hilfe",
    "Diese Befehle steuern den Musikplayer.",
    [
      field("/music play input:...", [
        "Spielt Suchbegriffe, YouTube-Links, YouTube Shorts oder Spotify-Links ab.",
        "YouTube Links werden direkt abgespielt.",
        "Spotify wird über Titel/Künstler erkannt und über YouTube gesucht."
      ]),
      field("/music playlist name:...", "Spielt eine gespeicherte Playlist ab."),
      field("Queue", [
        "`/music queue` - Queue anzeigen",
        "`/music nowplaying` - aktuellen Track anzeigen",
        "`/music skip` - Track überspringen",
        "`/music clear` - Queue leeren",
        "`/music shuffle` - Queue mischen",
        "`/music remove position:1` - Track entfernen"
      ]),
      field("Player", [
        "`/music pause` - pausieren",
        "`/music resume` - fortsetzen",
        "`/music stop` - stoppen",
        "`/music volume percent:20` - Lautstärke setzen"
      ]),
      field("Gespeicherte Lautstärke", [
        "Der Music Player startet standardmäßig mit 20 Prozent. Erlaubt sind 1 bis 100 Prozent. Erlaubt sind 1 bis 100 Prozent.",
        "Wenn die Lautstärke geändert wird, speichert der Bot sie pro Server.",
        "Beim nächsten Abspielen wird die gespeicherte Lautstärke automatisch geladen."
      ])
    ],
    0xe67e22
  );
}

function playlistHelp() {
  return makeEmbed(
    "📂 Playlist Hilfe",
    "Playlists können pro User oder global für den Server gespeichert werden.",
    [
      field("/playlist create", "Erstellt eine neue Playlist."),
      field("/playlist list", "Zeigt gespeicherte Playlists an."),
      field("/playlist add", "Fügt einen YouTube-, Spotify- oder normalen Link hinzu."),
      field("/playlist show", "Zeigt den Inhalt einer Playlist."),
      field("/playlist import", "Importiert eine Spotify- oder YouTube-Playlist."),
      field("/playlist remove", "Entfernt einen Eintrag aus einer Playlist."),
      field("/playlist delete", "Löscht eine komplette Playlist."),
      field("Favorites", [
        "Der `⭐ Favorite` Button speichert den aktuellen Track in deiner Playlist `Favorites`.",
        "Doppelte Einträge werden verhindert."
      ])
    ],
    0x00ffff
  );
}

function luckWheelHelp() {
  return makeEmbed(
    "🎡 Glücksrad Hilfe",
    "Das Glücksrad wählt zufällig Maps, Karten oder Mitglieder aus.",
    [
      field("/gluecksrad liste", [
        "Wählt zufällig aus einer eigenen Liste.",
        "Beispiel:",
        "`/gluecksrad liste eintraege: Inferno, Mirage, Dust2 titel: Nächste Map`"
      ]),
      field("/gluecksrad voice", [
        "Wählt zufällige Mitglieder aus deinem aktuellen Voice Channel.",
        "Beispiel:",
        "`/gluecksrad voice anzahl:2 titel: Team Auswahl`"
      ]),
      field("/gluecksradpanel kategorie:...", [
        "Erstellt das Glücksrad Panel im zentralen Panel-Channel.",
        "Das Panel enthält Dropdowns für Voice-Auswahl und Teams sowie einen Button für eigene Listen."
      ])
    ],
    0xf1c40f
  );
}

function chatgptHelp() {
  return makeEmbed(
    "🤖 ChatGPT Hilfe",
    "Mit diesem Command kannst du dem Bot eine Frage stellen.",
    [
      field("/chatgpt frage:...", "Stellt ChatGPT eine Frage."),
      field("Private Antwort", [
        "`private:Ja` - Antwort nur für dich sichtbar",
        "`private:Nein` - Antwort öffentlich"
      ]),
      field("Hinweis", [
        "Benötigt einen gültigen OpenAI API Key und verfügbares API-Guthaben.",
        "API-Fehler werden nutzerfreundlich angezeigt."
      ])
    ],
    0x3498db
  );
}

function techHelp() {
  return makeEmbed(
    "🛠 Technik Hilfe",
    "Nützliche Befehle für Wartung und Fehlerbehebung.",
    [
      field("PM2", [
        "`pm2 restart tempvoice --update-env`",
        "`pm2 logs tempvoice --lines 80`",
        "`pm2 flush tempvoice`",
        "`pm2 save`"
      ]),
      field("Slash Commands", [
        "`node deploy-commands.js`",
        "Danach Discord mit `STRG + R` neu laden."
      ]),
      field("Datenbank", "`npm run db:init`"),
      field("Sicherheit", [
        "`.env`, Bot Token, API Keys und Passwörter niemals veröffentlichen.",
        "Secrets niemals committen."
      ]),
      field("Modul-System", [
        "`/module list` - Module anzeigen",
        "`/module enable name:Music` - Modul aktivieren",
        "`/module disable name:Music` - Modul deaktivieren"
      ]),
      field("Moderation / Modlog", [
        "`/module enable name:Moderation` - Moderation aktivieren",
        "`/modlog setup channel:#mod-log` - Modlog einrichten",
        "`/modlog status` - Status anzeigen",
        "`/modlog disable` - Modlog deaktivieren"
      ]),
      field("Warn-System", [
        "`/warn user:@User grund:...` - User verwarnen",
        "`/warnings user:@User` - Verwarnungen anzeigen",
        "`/clearwarnings user:@User` - aktive Warns löschen"
      ]),
      field("Timeout-System", [
        "`/timeout user:@User minuten:10 grund:...` - User timeouten",
        "`/untimeout user:@User grund:...` - Timeout entfernen",
        "Timeouts werden im Modlog dokumentiert."
      ]),
      field("Kick-System", [
        "`/kick user:@User grund:...` - User vom Server kicken",
        "Kicks werden im Modlog dokumentiert."
      ]),
      field("Ban-System", [
        "`/ban user:@User grund:... nachrichten_tage:0` - User bannen",
        "`/unban userid:123456789 grund:...` - User entbannen",
        "Bans und Unbans werden im Modlog dokumentiert."
      ])
    ],
    0x2f3136
  );
}

function getHelp(category) {
  if (category === "panels") return panelsHelp();
  if (category === "tempvoice") return tempvoiceHelp();
  if (category === "music") return musicHelp();
  if (category === "playlist") return playlistHelp();
  if (category === "gluecksrad") return luckWheelHelp();
  if (category === "chatgpt") return chatgptHelp();
  if (category === "technik") return techHelp();

  return overviewHelp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Zeigt die Hilfe für TempVoicePro")
    .addStringOption(option =>
      option
        .setName("kategorie")
        .setDescription("Welche Hilfe möchtest du sehen?")
        .setRequired(false)
        .addChoices(
          { name: "Übersicht", value: "uebersicht" },
          { name: "Panels", value: "panels" },
          { name: "TempVoice", value: "tempvoice" },
          { name: "Musik", value: "music" },
          { name: "Playlists", value: "playlist" },
          { name: "Glücksrad", value: "gluecksrad" },
          { name: "ChatGPT", value: "chatgpt" },
          { name: "Technik", value: "technik" }
        )
    )
    .addBooleanOption(option =>
      option
        .setName("oeffentlich")
        .setDescription("Soll die Hilfe für alle sichtbar sein?")
        .setRequired(false)
    ),

  async execute(interaction) {
    const category = interaction.options.getString("kategorie") || "uebersicht";
    const publicAnswer = interaction.options.getBoolean("oeffentlich") || false;

    const options = {
      embeds: [getHelp(category)]
    };

    if (!publicAnswer) {
      options.flags = MessageFlags.Ephemeral;
    }

    return interaction.reply(options);
  }
};

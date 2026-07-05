# Changelog

Alle wichtigen Änderungen an TempVoicePro werden hier dokumentiert.

Dieses Changelog wurde nachträglich aus dem bisherigen Projektverlauf erstellt und wird ab jetzt nach größeren Entwicklungsschritten weitergeführt.

## [Unreleased]

### 2026-07-05 - Webpanel Navigation

- Server-Dashboard in Übersicht, Module, Auto-Mod und Modlog aufgeteilt
- Navigation zwischen Webpanel-Unterseiten ergänzt
- Formulare leiten nach dem Speichern auf die passende Unterseite zurück

### 2026-07-05 - Webpanel Navigation

- Server-Dashboard in Übersicht, Module, Auto-Mod und Modlog aufgeteilt
- Navigation zwischen Webpanel-Unterseiten ergänzt
- Formulare leiten nach dem Speichern auf die passende Unterseite zurück

### 2026-07-05 - Webpanel Navigation

- Server-Dashboard in Übersicht, Module, Auto-Mod und Modlog aufgeteilt
- Navigation zwischen Webpanel-Unterseiten ergänzt
- Formulare leiten nach dem Speichern auf die passende Unterseite zurück

### 2026-07-05 - Webpanel Navigation

- Server-Dashboard in Übersicht, Module, Auto-Mod und Modlog aufgeteilt
- Navigation zwischen Webpanel-Unterseiten ergänzt
- Formulare leiten nach dem Speichern auf die passende Unterseite zurück

### 2026-07-05 - Webpanel Navigation

- Server-Dashboard in Übersicht, Module, Auto-Mod und Modlog aufgeteilt
- Navigation zwischen Webpanel-Unterseiten ergänzt
- Formulare leiten nach dem Speichern auf die passende Unterseite zurück

### 2026-07-05 - Webpanel Navigation

- Server-Dashboard in Übersicht, Module, Auto-Mod und Modlog aufgeteilt
- Navigation zwischen Webpanel-Unterseiten ergänzt
- Formulare leiten nach dem Speichern auf die passende Unterseite zurück

### 2026-07-05 - Webpanel Modlog Formular

- Modlog kann im Webpanel aktiviert und deaktiviert werden
- Modlog-Channel kann im Webpanel ausgewählt werden
- Änderungen werden in guild_moderation_settings gespeichert

### 2026-07-05 - Webpanel Auto-Mod Formular

- Auto-Mod Einstellungen können im Webpanel bearbeitet werden
- Anti-Spam, Anti-Link, Anti-Caps, Auto-Warn und Auto-Timeout als Formular eingebaut
- Änderungen werden in automod_settings gespeichert

### 2026-07-05 - Webpanel Discord API Cache

- Discord Guild-Liste wird im Webpanel zwischengespeichert
- 429 Rate-Limit Fehler beim Server-Dashboard reduziert
- Logout löscht Webpanel-Cookies sauber

### 2026-07-05 - Webpanel Server Dashboard

- Serverseite um Bot Status, Module, Modlog und Auto-Mod erweitert
- Webpanel zeigt erste echte Serverdaten aus MySQL und Bot-Cache

### 2026-07-05 - Webpanel Grundgerüst

- Express Webpanel erstellt
- Discord OAuth2 Login vorbereitet
- Dashboard und Serverauswahl eingebaut
- Webpanel in Bot-Prozess eingebunden

### 2026-07-05 - Auto-Mod System

- Auto-Mod Engine fertig eingebunden
- MessageCreate Event für Auto-Mod und Panel-Cleanup erstellt
- Anti-Spam, Anti-Link, Anti-Caps, Auto-Warn, Cases und Modlog verbunden
- MessageContent Intent ergänzt

### 2026-07-05 - Auto-Mod System

- Auto-Mod Engine fertig eingebunden
- MessageCreate Event für Auto-Mod und Panel-Cleanup erstellt
- Anti-Spam, Anti-Link, Anti-Caps, Auto-Warn, Cases und Modlog verbunden
- MessageContent Intent ergänzt

### 2026-07-05 - Auto-Mod Einbindung

- Command /automod dem Moderation-Modul zugeordnet
- Help und README um Auto-Mod ergänzt
- Auto-Mod Bedienung dokumentiert

### 2026-07-05 - Auto-Mod Command

- Command /automod erstellt
- Status, Enable, Disable und Filter-Konfiguration ergänzt
- Anti-Spam, Anti-Link, Anti-Caps, Auto-Warn und Auto-Timeout steuerbar gemacht

### 2026-07-05 - Auto-Mod Message Handler

- Auto-Mod Engine in messageCreate eingebunden
- Nachrichten werden künftig automatisch geprüft
- Gelöschte Auto-Mod Nachrichten stoppen weitere Verarbeitung

### 2026-07-05 - Auto-Mod Message Handler

- Auto-Mod Engine in messageCreate eingebunden
- Nachrichten werden künftig automatisch geprüft
- Gelöschte Auto-Mod Nachrichten stoppen weitere Verarbeitung

### 2026-07-05 - Auto-Mod Message Handler

- Auto-Mod Engine in messageCreate eingebunden
- Nachrichten werden künftig automatisch geprüft
- Gelöschte Auto-Mod Nachrichten stoppen weitere Verarbeitung

### 2026-07-05 - Auto-Mod Engine

- Auto-Mod Scanner erstellt
- Anti-Spam, Anti-Link und Anti-Caps Erkennung vorbereitet
- Auto-Warn, Case-Erstellung, Modlog und optionaler Timeout vorbereitet

### 2026-07-05 - Auto-Mod vorbereitet

- Auto-Mod Settings-Helper `src/utils/autoModSettings.js` erstellt.
- Tabelle `automod_settings` in `init-db.js` ergänzt.
- Grundlage für Anti-Spam, Anti-Link, Anti-Caps, Auto-Warn und Auto-Timeout geschaffen.

### 2026-07-05 - Changelog-Automation

- `CHANGELOG.md` erstellt.
- Script `scripts/changelog-add.js` erstellt.
- NPM-Script `changelog:add` ergänzt.
- README um Changelog-Hinweis erweitert.

### 2026-07-05 - Moderation User-Profil

- `/moduser` hinzugefügt.
- Moderationsprofil pro User erstellt.
- Anzeige für aktive Warns, Cases, Warns, Timeouts, Kicks, Bans, Unbans und letzte Cases eingebaut.

### 2026-07-05 - Moderation Case-System

- Tabelle `moderation_cases` erstellt.
- Case-IDs für Moderationsaktionen eingeführt.
- `/cases recent`, `/cases user`, `/cases show` und `/cases reason` hinzugefügt.
- Case-Gründe können nachträglich geändert werden.
- Modlog-Einträge zeigen Case-IDs.

### 2026-07-05 - Moderation Commands

- `/modlog` hinzugefügt.
- `/warn`, `/warnings`, `/clearwarnings` hinzugefügt.
- `/timeout`, `/untimeout`, `/kick`, `/ban` und `/unban` hinzugefügt.
- Moderation-Modul standardmäßig deaktiviert und über `/module enable name:Moderation` aktivierbar gemacht.

### 2026-07-05 - Server Modul-System

- `/module list`, `/module enable`, `/module disable` hinzugefügt.
- Tabelle `guild_modules` ergänzt.
- Commands werden blockiert, wenn ihr Modul deaktiviert ist.
- Modul-Panel mit Dropdown und Buttons erstellt.

### 2026-07-05 - Zentrales Panel-System

- Zentralen Panel-Channel `#bot-panels` eingeführt.
- `/panels`, `/panelcleanup` und `/panelcheck` hinzugefügt.
- Bot Status Panel, Server Module Panel, TempVoice Status Panel und Music Player Panel eingebaut.
- Panel Auto-Refresh und Refresh-Button ergänzt.
- Normale Nachrichten im Panel-Channel werden automatisch gelöscht.

### 2026-07-04 - Glücksrad-System

- `/gluecksrad` und `/gluecksradpanel` hinzugefügt.
- Glücksrad-Panel mit Dropdown erstellt.
- Voice-Auswahl, Team-Auswahl und eigene Listen per Modal unterstützt.

### 2026-07-04 - Music und Playlist-System

- `/music` erweitert.
- `/playlist` hinzugefügt.
- Playlist-System mit MySQL-Speicherung erstellt.
- Spotify- und YouTube-Metadaten verarbeitet.
- YouTube Direct Links und Shorts unterstützt.
- Music Panel mit Buttons erstellt.
- Music Volume Persistenz pro Server ergänzt.
- Standardlautstärke auf 20 Prozent gesetzt.
- Auto-Leave nach leerer Queue eingebaut.

### 2026-07-04 - ChatGPT Command

- `/chatgpt` hinzugefügt.
- OpenAI API-Anbindung vorbereitet.
- `.env`-Konfiguration für OpenAI ergänzt.
- OpenAI Dependency ergänzt.

### 2026-07-04 - TempVoice System

- `/setup` erstellt Creator-Voice und Kategorie.
- Temporäre Voice Channels werden automatisch erstellt und gelöscht.
- Temporäre Panel-Textkanäle pro Lobby erstellt.
- Owner-System, Claim-System und Co-Owner-System eingebaut.
- Lock, Unlock, Hide, Show, Rename, Limit, Bitrate, Private/Public, Kick, Ban und Unban für Lobbys ergänzt.
- TempVoice Status Panel ergänzt.

### 2026-07-04 - Projektgrundlage

- Discord Bot Projekt `TempVoicePro` eingerichtet.
- Node.js und discord.js verwendet.
- Command Loader und Event Loader eingebaut.
- `deploy-commands.js` eingerichtet.
- MariaDB/MySQL-Anbindung erstellt.
- `init-db.js` für Datenbanktabellen erstellt.
- PM2-Prozess `tempvoice` eingerichtet.
- `.env` abgesichert und aus Git entfernt.
- `.gitignore` erweitert.
- README erstellt und fortlaufend ergänzt.
- `npm run check` mit Syntaxprüfung eingeführt.

## Changelog-Pflege

Neue größere Änderungen können so eingetragen werden:

    npm run changelog:add -- "Titel des Schritts" "Erster Punkt" "Zweiter Punkt"

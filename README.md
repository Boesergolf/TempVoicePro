# TempVoicePro

TempVoicePro ist ein Discord TempVoice Bot, mit dem Nutzer automatisch eigene temporäre Voice Channels erstellen können.

Wenn ein User den Creator-Channel betritt, erstellt der Bot automatisch einen neuen Voice Channel wie zum Beispiel `Lobby 1`, `Lobby 2`, `Lobby 3` und verschiebt den User direkt hinein. Zusätzlich erstellt der Bot einen passenden temporären Panel-Textkanal mit Buttons zur Verwaltung des Voice Channels.

> Dieses Projekt wurde mit Unterstützung von ChatGPT entwickelt und Schritt für Schritt umgesetzt.

---

## Funktionen

- Automatische Erstellung temporärer Voice Channels
- Fortlaufende Channel-Namen:
  - `Lobby 1`
  - `Lobby 2`
  - `Lobby 3`
- Automatisches Verschieben des Users in den neuen Channel
- Temporärer Panel-Textkanal pro Voice Channel
- Automatisches Löschen leerer TempVoice Channels
- Automatisches Löschen des zugehörigen Panel-Textkanals
- MySQL/MariaDB Speicherung
- Slash Commands
- Discord Buttons zur Channel-Verwaltung

---

## Panel Buttons

Der Bot erstellt für jeden TempVoice Channel ein eigenes Control Panel.

Aktuell unterstützt das Panel unter anderem:

- `Lock` - Channel sperren
- `Unlock` - Channel entsperren
- `Hide` - Channel verstecken
- `Show` - Channel sichtbar machen
- `Rename` - Channel umbenennen
- `Limit` - Userlimit setzen
- `Bitrate` - Bitrate ändern
- `Owner` - aktuellen Owner anzeigen
- `Claim` - Owner übernehmen, wenn der alte Owner nicht mehr im Channel ist
- `Close` - TempVoice Channel direkt schließen
- `Private` - Channel privat machen
- `Public` - Channel wieder öffentlich machen
- `Kick` - User aus dem TempVoice Channel kicken
- `Ban` - User aus dem TempVoice Channel ausschließen
- `Unban` - User wieder erlauben
- `Add Co-Owner` - Co-Owner hinzufügen
- `Remove Co-Owner` - Co-Owner entfernen

---

## Slash Commands

Aktuelle Slash Commands:

- `/setup` - TempVoice System einrichten
- `/stats` - Statistiken anzeigen
- `/lock` - aktuellen TempVoice Channel sperren
- `/unlock` - aktuellen TempVoice Channel entsperren
- `/rename` - aktuellen TempVoice Channel umbenennen
- `/addcoowner` - Co-Owner hinzufügen
- `/removecoowner` - Co-Owner entfernen

---

## Voraussetzungen

- Node.js 20 oder neuer
- MySQL oder MariaDB
- Discord Bot Token
- Discord Server mit passenden Bot-Rechten
- Linux VPS empfohlen

Getestet wurde das Projekt mit:

- Node.js v22
- discord.js v14
- MariaDB/MySQL
- PM2

---

## Benötigte Discord Bot Rechte

Der Bot benötigt auf dem Discord Server mindestens folgende Rechte:

- Kanäle verwalten
- Mitglieder verschieben
- Kanäle ansehen
- Verbinden
- Sprechen
- Nachrichten senden
- Nachrichten verwalten
- Embeds senden
- Slash Commands verwenden

Empfohlene Rechte für eine einfache Einrichtung:

- Administrator

Nach erfolgreicher Einrichtung können die Rechte später eingeschränkt werden.

---

## Installation

Repository klonen:

```bash
git clone https://github.com/Boesergolf/TempVoicePro.git
cd TempVoicePro
```

Abhängigkeiten installieren:

```bash
npm install
```

---

## .env Datei erstellen

Erstelle eine `.env` Datei im Projektordner:

```bash
nano .env
```

Beispiel:

```env
TOKEN=DEIN_DISCORD_BOT_TOKEN
CLIENT_ID=DEINE_CLIENT_ID
GUILD_ID=DEINE_SERVER_ID

DB_HOST=localhost
DB_USER=root
DB_PASS=DEIN_MYSQL_PASSWORT
DB_NAME=tempvoice
```

Wichtig:

- Die `.env` Datei darf niemals auf GitHub hochgeladen werden.
- Der Bot Token darf niemals öffentlich geteilt werden.
- Wenn der Token versehentlich veröffentlicht wurde, muss er im Discord Developer Portal zurückgesetzt werden.

---

## Datenbank initialisieren

TempVoicePro besitzt ein Initialisierungsscript für die Datenbank.

Ausführen mit:

```bash
npm run db:init
```

Das Script erstellt automatisch:

- Datenbank, falls sie fehlt
- Tabellen, falls sie fehlen
- benötigte Spalten, falls sie fehlen

Es werden keine bestehenden Daten gelöscht.

---

## Slash Commands deployen

Nach der Einrichtung müssen die Slash Commands an Discord übertragen werden:

```bash
npm run deploy
```

oder:

```bash
node deploy-commands.js
```

Danach Discord einmal neu laden.

---

## Bot starten

Direkt starten:

```bash
npm start
```

Oder mit PM2 dauerhaft laufen lassen:

```bash
pm2 start src/index.js --name tempvoice
pm2 save
```

Logs anzeigen:

```bash
pm2 logs tempvoice
```

Bot neustarten:

```bash
pm2 restart tempvoice --update-env
```

---

## Einrichtung im Discord Server

Im Discord Server:

```text
/setup
```

Der Bot erstellt automatisch:

- eine TempVoice Kategorie
- einen Creator Voice Channel

Wenn ein User den Creator Channel betritt, erstellt der Bot automatisch einen eigenen temporären Voice Channel.

---

## Projektstruktur

```text
TempVoicePro/
├── src/
│   ├── buttons/
│   ├── commands/
│   ├── database/
│   ├── events/
│   ├── handlers/
│   └── utils/
├── deploy-commands.js
├── init-db.js
├── package.json
├── package-lock.json
└── README.md
```

---

## Wichtige Dateien

### `src/events/voiceStateUpdate.js`

Verantwortlich für:

- Erkennen, wenn ein User den Creator Channel betritt
- Erstellen des temporären Voice Channels
- Erstellen des temporären Panel-Textkanals
- Owner-Übergabe
- Löschlogik beim Verlassen

### `src/utils/tempChannels.js`

Verantwortlich für:

- Löschen leerer TempVoice Channels
- Löschen der zugehörigen Panel-Textkanäle
- Entfernen der Datenbank-Einträge

### `src/events/interactionCreate.js`

Verantwortlich für:

- Slash Commands
- Buttons
- Modals

### `init-db.js`

Verantwortlich für:

- automatische Datenbankeinrichtung
- Tabellenprüfung
- Spaltenprüfung

---

## Datenbanktabellen

TempVoicePro nutzt folgende Tabellen:

```text
guild_settings
temp_channels
temp_permissions
```

Diese werden automatisch durch `npm run db:init` erstellt.

---

## Entwicklung

Syntax prüfen:

```bash
node --check src/index.js
node --check src/events/voiceStateUpdate.js
node --check src/events/interactionCreate.js
```

Git Status prüfen:

```bash
git status
```

Änderungen speichern:

```bash
git add .
git commit -m "Update TempVoicePro"
git push origin master
```

---

## Sicherheit

Bitte niemals folgende Daten veröffentlichen:

- Discord Bot Token
- `.env` Datei
- Datenbankpasswort
- private Serverdaten

Die Datei `.env` sollte immer in `.gitignore` stehen.

---

## Hinweis

TempVoicePro ist ein Lern- und Praxisprojekt. Der Bot wurde Schritt für Schritt aufgebaut, getestet und erweitert.

Das Projekt wurde mit Hilfe von ChatGPT entwickelt.

---

## Lizenz

Dieses Projekt kann privat verwendet und weiterentwickelt werden.


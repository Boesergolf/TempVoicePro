# TempVoicePro - Codex Arbeitsanweisungen

## Sprache
Antworte dem Nutzer auf Deutsch.

## Projekt
TempVoicePro ist ein Discord Bot auf Node.js mit discord.js v14.

## Wichtige Regeln
- Niemals `.env`, Tokens, Secrets oder Passwörter committen.
- Nach Codeänderungen immer ausführen:
  npm run check
- Bei Slash-Command-Änderungen:
  node deploy-commands.js
- Bot läuft über PM2 als:
  tempvoice
- Neustart:
  pm2 restart tempvoice --update-env
- Nach stabilen Änderungen:
  git status --short
  git add ...
  git commit -m "..."
  git push origin master
  pm2 save

## Projektpfad
/root/TempVoicePro oder ~/TempVoicePro

## Stil
- Kleine, nachvollziehbare Änderungen.
- Keine wilden Komplett-Rewrites ohne Grund.
- Vor größeren Änderungen erst relevante Dateien prüfen.
- Bestehende Architektur respektieren.

## Aktuelle Bot-Bereiche
- TempVoice mit gemeinsamem #tempvoice-panels Channel
- Musiksystem mit Musikpanel
- Playlist-System mit Spotify/YouTube Import
- Glücksrad
- Moderation
- Webpanel
- Modulverwaltung
- Botstatus/Admin-Checks geplant

## Tests
Immer mindestens:
npm run check

Wenn der Bot neugestartet wird:
pm2 flush tempvoice
pm2 restart tempvoice --update-env
tail -n 100 /root/.pm2/logs/tempvoice-error.log

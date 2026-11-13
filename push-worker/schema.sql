-- Datenbank des Push-Dienstes (Cloudflare D1)
-- Ein Gerät = ein Push-Abo (Browser/installierte App)
CREATE TABLE IF NOT EXISTS subs (
  id TEXT PRIMARY KEY,          -- SHA-256 des Endpoints
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
-- Geplante Erinnerungen (die App ersetzt sie bei jeder Änderung komplett)
CREATE TABLE IF NOT EXISTS reminders (
  sub_id TEXT NOT NULL,
  at INTEGER NOT NULL,          -- Zeitpunkt in ms (UTC)
  tag TEXT NOT NULL,            -- gleich wie in der App → keine doppelte Benachrichtigung
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS reminders_due ON reminders (sent, at);
CREATE INDEX IF NOT EXISTS reminders_sub ON reminders (sub_id);

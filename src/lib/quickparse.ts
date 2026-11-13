import { addDays, toISODate } from './date'
import type { Repeat } from './repeat'
import { shortName } from './spaces'

/*
 * Schnelleingabe in normaler Sprache – ohne KI, nur mit Regeln, komplett offline.
 * Versteht z. B.:
 *   „Zahnarzt morgen 15 Uhr“            → morgen, 15:00
 *   „Meeting Fr 9–10:30 !hoch“          → Freitag, 09:00–10:30, Priorität hoch
 *   „Müll rausbringen jeden Dienstag @anna“ → wöchentlich ab Dienstag, zuständig anna
 *   „Miete überweisen jeden 1.“         → monatlich am 1.
 *   „Steuer am 24.12. um 9“             → 24.12., 09:00
 * Was erkannt wurde, wird aus dem Titel entfernt.
 */

export interface QuickParse {
  title: string
  dueDate?: string
  start?: string
  end?: string
  repeat?: Repeat
  priority?: 1 | 2 | 3
  /** E-Mail, '' = ausdrücklich „für alle“, undefined = nichts erkannt */
  assignee?: string
  /** Wurde überhaupt etwas erkannt? */
  found: boolean
}

// Wortgrenzen, die auch mit Umlauten funktionieren (\b kennt kein „ä“)
const B = '(?<![\\p{L}\\d])'
const E = '(?![\\p{L}\\d])'

const WEEKDAYS: [string, number][] = [
  ['montag', 1],
  ['dienstag', 2],
  ['mittwoch', 3],
  ['donnerstag', 4],
  ['freitag', 5],
  ['samstag', 6],
  ['sonnabend', 6],
  ['sonntag', 0],
]
const WD_FULL = WEEKDAYS.map(([w]) => w).join('|')
// Kurzformen nur als eigenes Wort; „So“ nur mit Punkt (sonst ist es das Wort „so“)
const WD_SHORT: Record<string, number> = { mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, 'so.': 0 }

function weekdayIndex(word: string): number {
  const w = word.toLowerCase().replace(/s$/, '')
  const full = WEEKDAYS.find(([n]) => n === w)
  if (full) return full[1]
  return WD_SHORT[word.toLowerCase()] ?? WD_SHORT[word.toLowerCase().replace(/\.$/, '')] ?? -1
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Nächster Tag mit diesem Wochentag (0 = So); heute zählt, wenn includeToday. */
export function nextWeekday(today: string, wd: number, includeToday = true): string {
  const cur = parseISO(today).getDay()
  let diff = (wd - cur + 7) % 7
  if (diff === 0 && !includeToday) diff = 7
  return addDays(today, diff)
}

function nextMonthDay(today: string, day: number): string {
  const t = parseISO(today)
  for (let i = 0; i < 2; i++) {
    const y = t.getFullYear()
    const m = t.getMonth() + i
    const last = new Date(y, m + 1, 0).getDate()
    const iso = toISODate(new Date(y, m, Math.min(day, last)))
    if (iso >= today) return iso
  }
  return today
}

const NUMBER_WORDS: Record<string, number> = { ein: 1, eine: 1, einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10 }

const pad = (n: number) => String(n).padStart(2, '0')
function hhmm(h: string, m?: string): string | undefined {
  const hh = Number(h)
  const mm = m ? Number(m) : 0
  if (hh > 23 || mm > 59) return undefined
  return `${pad(hh)}:${pad(mm)}`
}

export function parseQuickInput(input: string, today: string, opts: { people?: string[]; me?: string } = {}): QuickParse {
  let text = ` ${input} `
  const r: QuickParse = { title: input.trim(), found: false }

  /** Erstes Vorkommen, das `fn` akzeptiert (true), aus dem Text entfernen. */
  function take(pattern: string, fn: (m: RegExpMatchArray) => boolean) {
    const re = new RegExp(pattern, 'giu')
    for (const m of text.matchAll(re)) {
      if (fn(m)) {
        text = text.slice(0, m.index) + ' ' + text.slice(m.index! + m[0].length)
        r.found = true
        return true
      }
    }
    return false
  }

  /* ---- Wiederholung (vor den Datumsangaben, weil sie Wochentage enthält) ---- */
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Kette: der erste Treffer gewinnt
  take(`${B}(jeden\\s+tag|täglich)${E}`, () => ((r.repeat = 'daily'), true)) ||
    take(`${B}(werktags|jeden\\s+werktag|mo\\s*[-–]\\s*fr)${E}`, () => ((r.repeat = 'weekdays'), true)) ||
    take(`${B}(alle\\s+(2|zwei)\\s+wochen|zweiwöchentlich|14-tägig|vierzehntägig)${E}`, () => ((r.repeat = 'biweekly'), true)) ||
    take(`${B}(?:jeden|jede)\\s+(${WD_FULL})${E}|${B}(${WD_FULL})s${E}`, (m) => {
      const wd = weekdayIndex(m[1] ?? m[2])
      if (wd < 0) return false
      r.repeat = 'weekly'
      r.dueDate = nextWeekday(today, wd)
      return true
    }) ||
    take(`${B}(jede\\s+woche|wöchentlich)${E}`, () => ((r.repeat = 'weekly'), true)) ||
    take(`${B}(?:jeden|monatlich\\s+am)\\s+(\\d{1,2})\\.(?:\\s+(?:des\\s+)?monats)?(?!\\d)`, (m) => {
      const day = Number(m[1])
      if (day < 1 || day > 31) return false
      r.repeat = 'monthly'
      r.dueDate = nextMonthDay(today, day)
      return true
    }) ||
    take(`${B}(jeden\\s+monat|monatlich)${E}`, () => ((r.repeat = 'monthly'), true)) ||
    take(`${B}(jedes\\s+jahr|jährlich)${E}`, () => ((r.repeat = 'yearly'), true))

  /* ---- Datum ---- */
  if (!r.dueDate) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Kette: der erste Treffer gewinnt
    take(`${B}übermorgen${E}`, () => ((r.dueDate = addDays(today, 2)), true)) ||
      take(`${B}morgen${E}`, () => ((r.dueDate = addDays(today, 1)), true)) ||
      take(`${B}heute${E}`, () => ((r.dueDate = today), true)) ||
      // 24.12. / 24.12.2026 / 24.12.26 (mit Punkt nach dem Monat oder mit Jahr)
      take(`${B}(?:am\\s+)?(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4}|\\d{2})?(?!\\d)`, (m) => {
        const d = Number(m[1])
        const mo = Number(m[2])
        if (d < 1 || d > 31 || mo < 1 || mo > 12) return false
        const tY = Number(today.slice(0, 4))
        let y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : tY
        let iso = `${y}-${pad(mo)}-${pad(d)}`
        if (!m[3] && iso < today) iso = `${++y}-${pad(mo)}-${pad(d)}`
        r.dueDate = iso
        return true
      }) ||
      take(`${B}in\\s+(\\d+|ein|einem|einer|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\\s+(tag|tagen|woche|wochen)${E}`, (m) => {
        const n = /\d/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1].toLowerCase()]
        r.dueDate = addDays(today, m[2].toLowerCase().startsWith('woche') ? n * 7 : n)
        return true
      }) ||
      take(`${B}(nächste|kommende)\\s+woche${E}`, () => ((r.dueDate = nextWeekday(today, 1, false)), true)) ||
      take(`${B}(?:(am|nächsten|kommenden)\\s+)?(${WD_FULL})${E}`, (m) => {
        const wd = weekdayIndex(m[2])
        if (wd < 0) return false
        r.dueDate = nextWeekday(today, wd, !m[1] || m[1].toLowerCase() === 'am')
        return true
      }) ||
      take(`${B}(mo|di|mi|do|fr|sa)\\.?${E}|${B}so\\.`, (m) => {
        const wd = weekdayIndex(m[1] ?? 'so.')
        if (wd < 0) return false
        r.dueDate = nextWeekday(today, wd)
        return true
      })
  }

  /* ---- Uhrzeit ---- */
  // Spanne: „9–10“, „9:30-11 Uhr“, „von 9 bis 10“ – nur mit „von“, „:“ oder „Uhr“ (sonst wäre „2-3 Äpfel“ eine Zeit)
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Kette: der erste Treffer gewinnt
  take(`${B}(von\\s+|um\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*(uhr)?\\s*(?:-|–|bis)\\s*(\\d{1,2})(?::(\\d{2}))?\\s*(uhr)?${E}`, (m) => {
    if (!m[1] && !m[3] && !m[4] && !m[6] && !m[7]) return false
    const s = hhmm(m[2], m[3])
    const e = hhmm(m[5], m[6])
    if (!s || !e || e <= s) return false
    r.start = s
    r.end = e
    return true
  }) ||
    // Einzelzeit: „15 Uhr“, „15:30“, „um 9“, „ab 18.30 Uhr“
    take(`${B}(?:(um|ab)\\s+)?(\\d{1,2})(?:[:.](\\d{2}))?\\s*uhr${E}|${B}(?:(um|ab)\\s+)(\\d{1,2})(?::(\\d{2}))?${E}|${B}(\\d{1,2}):(\\d{2})${E}`, (m) => {
      const s = hhmm(m[2] ?? m[5] ?? m[7], m[3] ?? m[6] ?? m[8])
      if (!s) return false
      r.start = s
      return true
    })

  /* ---- Priorität ---- */
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Kette: der erste Treffer gewinnt
  take(`(?:^|\\s)(!hoch|!wichtig|!1|!!+)${E}`, () => ((r.priority = 1), true)) ||
    take(`(?:^|\\s)(!mittel|!2)${E}`, () => ((r.priority = 2), true)) ||
    take(`(?:^|\\s)(!niedrig|!3)${E}`, () => ((r.priority = 3), true))

  /* ---- Zuständig (nur in gemeinsamen Bereichen) ---- */
  if (opts.people) {
    take(`(?:^|\\s)@([\\p{L}\\d._-]+)`, (m) => {
      const who = m[1].toLowerCase()
      if (who === 'alle') return (r.assignee = ''), true
      if (who === 'ich' || who === 'mich') return opts.me ? ((r.assignee = opts.me), true) : false
      const hit = opts.people!.find((p) => shortName(p).toLowerCase().startsWith(who) || p.toLowerCase().startsWith(who))
      if (!hit) return false
      r.assignee = hit
      return true
    })
  }

  // Titel aufräumen: übrig gebliebene Füllwörter am Rand, doppelte Leerzeichen, Satzzeichen
  let title = text.replace(/\s+/g, ' ').trim()
  const filler = /^(am|um|ab|von|bis|für|und|,|-|–)\s+|\s+(am|um|ab|von|bis|für|und|,|-|–)$/iu
  for (let i = 0; i < 4 && filler.test(title); i++) title = title.replace(filler, '').trim()
  title = title.replace(/[\s,;:–-]+$/u, '').trim()
  r.title = title || input.trim()
  return r
}

import { addDays } from './date'

/*
 * Wiederkehrende Aufgaben: Wird eine wiederkehrende Aufgabe erledigt, legt die App automatisch
 * die nächste an (gleicher Titel, Priorität, Bereich, Zuständigkeit, Uhrzeit) – mit dem nächsten Termin.
 */

export type Repeat = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export const REPEAT_OPTIONS: { value: Repeat; label: string }[] = [
  { value: 'daily', label: 'Täglich' },
  { value: 'weekdays', label: 'Werktags (Mo–Fr)' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'biweekly', label: 'Alle 2 Wochen' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'yearly', label: 'Jährlich' },
]

export function repeatLabel(r: Repeat): string {
  return REPEAT_OPTIONS.find((o) => o.value === r)?.label ?? ''
}

function parse(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Monat/Jahr weiterzählen; der Tag wird aufs Monatsende begrenzt (31. → 30./28.). */
function addMonths(date: string, months: number): string {
  const { y, m, d } = parse(date)
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const lastDay = new Date(ny, nm, 0).getDate()
  return iso(ny, nm, Math.min(d, lastDay))
}

/** Ein Schritt im Rhythmus. */
function step(date: string, r: Repeat): string {
  switch (r) {
    case 'daily':
      return addDays(date, 1)
    case 'weekdays': {
      let next = addDays(date, 1)
      const { y, m, d } = parse(next)
      const wd = new Date(y, m - 1, d).getDay() // 0 = So, 6 = Sa
      if (wd === 6) next = addDays(next, 2)
      else if (wd === 0) next = addDays(next, 1)
      return next
    }
    case 'weekly':
      return addDays(date, 7)
    case 'biweekly':
      return addDays(date, 14)
    case 'monthly':
      return addMonths(date, 1)
    case 'yearly':
      return addMonths(date, 12)
  }
}

/**
 * Nächster Termin nach `due`, mindestens nach `today` (verspätet Erledigtes springt nicht in die Vergangenheit).
 * Beispiel: „Müll, wöchentlich, Di“ am Donnerstag erledigt → nächster Dienstag.
 */
export function nextDueDate(due: string, r: Repeat, today: string): string {
  let next = step(due, r)
  for (let i = 0; next <= today && i < 1000; i++) next = step(next, r)
  return next
}

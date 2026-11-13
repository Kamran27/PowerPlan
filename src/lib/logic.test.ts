import { describe, expect, it, vi } from 'vitest'

// Die Datenbank (Dexie Cloud) wird für diese reinen Logik-Tests nicht gebraucht
vi.mock('../db', () => ({ db: {} }))
vi.mock('dexie-cloud-addon', () => ({ default: {}, getTiedRealmId: () => 'rlm-test' }))

import type { Task } from '../db'
import { parseQuickInput } from './quickparse'
import { combineIngredients, parseIngredientLine, parseIngredients, scaleQty, splitQty } from './recipes'
import { nextDueDate } from './repeat'
import { buildHistory, guessCategory, suggest } from './shopping'
import { makeRotation, nextInRotation, pointsForMe, visibleForMe } from './spaces'
import { dayStatus, streaks } from './points'
import { subtaskProgress } from './subtasks'

const FRIDAY = '2026-11-13'
const ME = 'ich@example.com'
const ANNA = 'anna.muster@example.com'

describe('Wiederholungen', () => {
  it('springt nach verspätetem Erledigen auf den nächsten regulären Termin', () => {
    expect(nextDueDate('2026-11-10', 'weekly', '2026-11-12')).toBe('2026-11-17')
  })
  it('überspringt das Wochenende bei „werktags“', () => {
    expect(nextDueDate(FRIDAY, 'weekdays', FRIDAY)).toBe('2026-11-16')
  })
  it('begrenzt monatlich auf das Monatsende', () => {
    expect(nextDueDate('2027-01-31', 'monthly', '2027-01-31')).toBe('2027-02-28')
  })
  it('zählt jährlich und zweiwöchentlich richtig', () => {
    expect(nextDueDate(FRIDAY, 'yearly', FRIDAY)).toBe('2027-11-13')
    expect(nextDueDate(FRIDAY, 'biweekly', FRIDAY)).toBe('2026-11-27')
  })
})

describe('Schnelleingabe', () => {
  const p = (s: string) => parseQuickInput(s, FRIDAY, { people: [ME, ANNA], me: ME })

  it.each([
    ['Zahnarzt morgen 15 Uhr', { title: 'Zahnarzt', dueDate: '2026-11-14', start: '15:00' }],
    ['Meeting Fr 9–10:30 !hoch', { title: 'Meeting', dueDate: FRIDAY, start: '09:00', end: '10:30', priority: 1 }],
    ['Müll rausbringen jeden Dienstag @anna', { title: 'Müll rausbringen', dueDate: '2026-11-17', repeat: 'weekly', assignee: ANNA }],
    ['Miete überweisen jeden 1.', { title: 'Miete überweisen', dueDate: '2026-12-01', repeat: 'monthly' }],
    ['Steuer am 24.12. um 9', { title: 'Steuer', dueDate: '2026-12-24', start: '09:00' }],
    ['Sport werktags 7-8 Uhr', { title: 'Sport', repeat: 'weekdays', start: '07:00', end: '08:00' }],
    ['Rechnung bezahlen in 3 Tagen', { title: 'Rechnung bezahlen', dueDate: '2026-11-16' }],
    ['Papa Geburtstag 3.5. jährlich', { title: 'Papa Geburtstag', dueDate: '2027-05-03', repeat: 'yearly' }],
    ['Flug am 2.1.27 6:15', { title: 'Flug', dueDate: '2027-01-02', start: '06:15' }],
    ['Müll jeden Dienstag abwechselnd', { title: 'Müll', repeat: 'weekly', rotate: true }],
  ])('versteht „%s“', (input, expected) => {
    expect(p(input)).toMatchObject(expected)
  })

  it.each(['2-3 Äpfel kaufen', 'so ein Quatsch', 'Brief an Mo schreiben'])('erkennt in „%s“ keine Zeit', (input) => {
    const r = p(input)
    expect(r.start).toBeUndefined()
    if (input !== 'Brief an Mo schreiben') expect(r.found).toBe(false)
  })
})

describe('Rezepte und Mengen', () => {
  it('liest Zutatenzeilen', () => {
    expect(parseIngredientLine('500 g Hackfleisch')).toMatchObject({ qty: '500 g', name: 'Hackfleisch', category: 'fleisch' })
    expect(parseIngredientLine('1 Dose Tomaten')).toMatchObject({ qty: '1 Dose', name: 'Tomaten', category: 'vorrat' })
    expect(parseIngredientLine('Salz')).toMatchObject({ name: 'Salz' })
    expect(parseIngredientLine('   ')).toBeNull()
  })
  it('rechnet Mengen um', () => {
    expect(scaleQty('500 g', 2)).toBe('1 kg')
    expect(scaleQty('500 g', 0.75)).toBe('375 g')
    expect(scaleQty('1 Dose', 1.5)).toBe('2 Dose')
    expect(scaleQty('3-4', 2)).toBe('6–8')
    expect(scaleQty('1,5 l', 2)).toBe('3 l')
    expect(scaleQty('etwas', 2)).toBe('etwas')
  })
  it('zerlegt Mengen', () => {
    expect(splitQty('500 g')).toEqual({ amount: 500, unit: 'g' })
    expect(splitQty('3–4')).toBeNull()
  })
  it('fasst gleiche Zutaten zusammen (auch Einzahl/Mehrzahl)', () => {
    const r = combineIngredients(parseIngredients('250 g Hackfleisch\n250 g Hackfleisch\n1 Zwiebel\n2 Zwiebeln\n800 g Mehl\n300 g Mehl\n1 Pck. Hackfleisch'))
    const byName = Object.fromEntries(r.map((i) => [i.name, i.qty]))
    expect(byName['Hackfleisch']).toBe('500 g + 1 Pck.')
    expect(byName['Zwiebel']).toBe('3')
    expect(byName['Mehl']).toBe('1,1 kg')
  })
})

describe('Einkaufsliste', () => {
  it.each([
    ['Milch', 'kuehl'],
    ['Reis', 'vorrat'],
    ['Eis', 'tk'],
    ['Eistee', 'getraenke'],
    ['Tomatenmark', 'vorrat'],
    ['Tomaten', 'obst'],
    ['Klopapier', 'drogerie'],
    ['Milchschokolade', 'snacks'],
    ['Kaugummi', 'sonstiges'],
  ])('ordnet %s der Abteilung %s zu', (name, cat) => {
    expect(guessCategory(name)).toBe(cat)
  })
  it('schlägt Gekauftes vor, aber nichts, was schon offen auf der Liste steht', () => {
    const item = (name: string, createdAt: string, qty?: string) =>
      ({ id: name + createdAt, listId: 'l', spaceId: 's', realmId: 'r', name, qty, done: true, createdAt }) as never
    const history = buildHistory([item('Milch', '2026-11-01', '1 l'), item('Milch', '2026-11-05', '2 l'), item('Mehl', '2026-11-02')])
    expect(history[0]).toMatchObject({ name: 'Milch', qty: '2 l', count: 2 })
    expect(suggest(history, new Set(['mehl']), 'm').map((s) => s.name)).toEqual(['Milch'])
  })
})

describe('Teilen und Rotation', () => {
  const task = (t: Partial<Task>) => ({ id: 'x', title: 'x', priority: 2, done: false, createdAt: '', ...t }) as Task
  it('zeigt private, „für alle“ und eigene Aufgaben – nicht die der anderen', () => {
    expect(visibleForMe(task({}), ME)).toBe(true)
    expect(visibleForMe(task({ spaceId: 's' }), ME)).toBe(true)
    expect(visibleForMe(task({ spaceId: 's', assignee: ME }), ME)).toBe(true)
    expect(visibleForMe(task({ spaceId: 's', assignee: ANNA }), ME)).toBe(false)
  })
  it('gibt Punkte für gemeinsame Aufgaben nur der Person, die erledigt hat', () => {
    expect(pointsForMe(task({ spaceId: 's', doneBy: ME }), ME)).toBe(true)
    expect(pointsForMe(task({ spaceId: 's', doneBy: ANNA }), ME)).toBe(false)
  })
  it('wechselt reihum', () => {
    const rot = makeRotation([ME, ANNA], ANNA)
    expect(rot).toEqual([ANNA, ME])
    expect(nextInRotation(rot, ANNA)).toBe(ME)
    expect(nextInRotation(rot, ME)).toBe(ANNA)
    expect(nextInRotation(rot, undefined)).toBe(ANNA)
  })
})

describe('Streak', () => {
  const done = (due: string, doneAt: string) => ({ id: due, title: '', priority: 2, done: true, doneAt, dueDate: due, createdAt: '' }) as Task
  it('zählt erfüllte Tage in Folge und überspringt Tage ohne Fälliges', () => {
    const tasks = [done('2026-11-10', '2026-11-10T10:00:00'), done('2026-11-12', '2026-11-12T10:00:00')]
    expect(dayStatus(tasks, '2026-11-11', FRIDAY)).toBe('neutral')
    expect(streaks(tasks, FRIDAY).current).toBe(2)
  })
})

describe('Unteraufgaben', () => {
  it('berechnet den Fortschritt', () => {
    expect(subtaskProgress([])).toBeNull()
    expect(
      subtaskProgress([
        { id: 'a', title: 'a', done: true },
        { id: 'b', title: 'b', done: false },
      ]),
    ).toEqual({ done: 1, total: 2, pct: 50 })
  })
})

describe('Wochenrückblick', () => {
  it('blickt ab Freitag auf die laufende Woche, Mo–Do auf die vergangene', async () => {
    const { reviewWeekFor } = await import('./points')
    expect(reviewWeekFor('2026-11-13')).toBe('2026-11-09') // Freitag
    expect(reviewWeekFor('2026-11-15')).toBe('2026-11-09') // Sonntag
    expect(reviewWeekFor('2026-11-16')).toBe('2026-11-09') // Montag danach
    expect(reviewWeekFor('2026-11-12')).toBe('2026-11-02') // Donnerstag
  })
})

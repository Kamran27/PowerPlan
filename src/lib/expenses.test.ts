import { describe, expect, it } from 'vitest'
import { balances, formatEuro, parseEuro, settle } from './expenses'
import { countdownText, kindInfo, SPACE_KINDS } from './spaceKinds'
import { focusRange } from './focusRange'
import { byCategory, fixTotals, goalPct, guessExpenseCategory, monthlyToReach, nextDue, occurrences, perMonth, perPersonMonth } from './budget'

const A = 'a@x.de'
const B = 'b@x.de'
const C = 'c@x.de'

describe('Kosten teilen', () => {
  it('teilt gleichmäßig und berechnet, wer wem schuldet', () => {
    const bal = balances([{ amount: 5000, paidBy: A }, { amount: 2000, paidBy: B }], [A, B])
    expect(bal.get(A)).toBe(1500)
    expect(bal.get(B)).toBe(-1500)
    expect(settle(bal)).toEqual([{ from: B, to: A, amount: 1500 }])
  })

  it('Ausgleich bringt den Stand auf null', () => {
    const bal = balances([{ amount: 5000, paidBy: A }, { amount: 2500, paidBy: B, to: A }], [A, B])
    expect(bal.get(A)).toBe(0)
    expect(bal.get(B)).toBe(0)
    expect(settle(bal)).toEqual([])
  })

  it('verliert bei drei Personen keinen Cent', () => {
    const bal = balances([{ amount: 1000, paidBy: A }], [A, B, C])
    expect([...bal.values()].reduce((s, v) => s + v, 0)).toBe(0)
    expect(settle(bal).reduce((s, t) => s + t.amount, 0)).toBe(666)
  })

  it('liest Eurobeträge', () => {
    expect(parseEuro('12,5')).toBe(1250)
    expect(parseEuro('12,50 €')).toBe(1250)
    expect(parseEuro('1.234,99')).toBe(123499)
    expect(parseEuro('7')).toBe(700)
    expect(parseEuro('abc')).toBeUndefined()
    expect(parseEuro('0')).toBeUndefined()
    expect(formatEuro(1250)).toMatch(/12,50\s€/)
  })
})

describe('Bereich-Vorlagen', () => {
  it('ohne Art = frei mit den bisherigen Reitern', () => {
    expect(kindInfo(undefined).id).toBe('frei')
    expect(kindInfo('unbekannt').tabs).toEqual(['aufgaben', 'einkauf', 'essen', 'mitglieder'])
  })

  it('jede Vorlage hat Mitglieder und eindeutige Reiter', () => {
    for (const k of SPACE_KINDS) {
      expect(k.tabs).toContain('mitglieder')
      expect(new Set(k.tabs).size).toBe(k.tabs.length)
      // Reiter „Listen“ nur mit einfachen Listen in der Vorlage
      if (k.tabs.includes('listen')) expect(k.lists.some((l) => l.plain)).toBe(true)
    }
  })

  it('Countdown-Text', () => {
    expect(countdownText('2026-11-14', '2026-11-14')).toBe('heute!')
    expect(countdownText('2026-11-15', '2026-11-14')).toBe('morgen')
    expect(countdownText('2026-12-04', '2026-11-14')).toBe('noch 20 Tage')
    expect(countdownText('2026-11-10', '2026-11-14')).toBe('vor 4 Tagen')
  })
})

describe('Fokus verlängert den Block im Tagesplan', () => {
  const h = (hh: number, mm = 0) => hh * 60 + mm
  it('Fokus im geplanten Block, aber länger → Ende wächst mit', () => {
    expect(focusRange({ start: h(18, 30), end: h(19, 30) }, h(19, 10), h(19, 55))).toEqual({ start: h(18, 30), end: h(19, 55) })
  })
  it('Fokus kürzer als geplant → Block bleibt', () => {
    expect(focusRange({ start: h(18, 30), end: h(19, 30) }, h(18, 30), h(18, 55))).toEqual({ start: h(18, 30), end: h(19, 30) })
  })
  it('Fokus zu anderer Zeit → Block wandert mit, Dauer bleibt mindestens', () => {
    expect(focusRange({ start: h(18, 30), end: h(19, 30) }, h(10, 2), h(10, 27))).toEqual({ start: h(10), end: h(11) })
    expect(focusRange({ start: h(9), end: h(9, 30) }, h(14, 3), h(15, 33))).toEqual({ start: h(14), end: h(15, 35) })
  })
  it('ohne Block → genau die Fokuszeit, nie über 23:59', () => {
    expect(focusRange(undefined, h(14, 3), h(14, 28))).toEqual({ start: h(14), end: h(14, 30) })
    expect(focusRange(undefined, h(23, 40), h(24, 30))).toEqual({ start: h(23, 40), end: h(23, 59) })
  })
})

describe('Budget', () => {
  it('rechnet Fixkosten auf Monat und Jahr um', () => {
    expect(perMonth({ amount: 1200 })).toBe(1200)
    expect(perMonth({ amount: 12000, interval: 'yearly' })).toBe(1000)
    expect(perMonth({ amount: 3000, interval: 'quarterly' })).toBe(1000)
    expect(fixTotals([{ amount: 80000 }, { amount: 12000, interval: 'yearly' }])).toEqual({ month: 81000, year: 972000 })
  })
  it('nächste Fälligkeit und Monatsende', () => {
    expect(nextDue(3, '2026-11-16')).toBe('2026-12-03')
    expect(nextDue(20, '2026-11-16')).toBe('2026-11-20')
    expect(nextDue(31, '2026-11-16')).toBe('2026-11-30')
    expect(nextDue(1, '2026-12-16')).toBe('2027-01-01')
  })
  it('Sparziel: Fortschritt und nötige Rate', () => {
    expect(goalPct(25000, 100000)).toBe(25)
    expect(goalPct(120000, 100000)).toBe(100)
    expect(monthlyToReach(25000, 100000, '2027-05-01', '2026-11-16')).toBe(12500)
    expect(monthlyToReach(100000, 100000, '2027-05-01', '2026-11-16')).toBeUndefined()
  })
})

describe('Persönlich und gemeinsam', () => {
  it('persönliche Ausgabe wird nicht geteilt; von anderem bezahlt → Schuld', () => {
    // A zahlt 30 € für B persönlich, B zahlt 20 € gemeinsam
    const bal = balances([{ amount: 3000, paidBy: A, forPerson: B }, { amount: 2000, paidBy: B }], [A, B])
    expect(bal.get(A)).toBe(2000)
    expect(bal.get(B)).toBe(-2000)
    // selbst bezahlt, nur für sich → keine Schuld
    expect(balances([{ amount: 5000, paidBy: A, forPerson: A }], [A, B]).get(B)).toBe(0)
  })
  it('Monat pro Person: Fixkosten und Ausgaben', () => {
    const r = perPersonMonth(
      [A, B],
      [{ amount: 100000 }, { amount: 2000, forPerson: A }, { amount: 12000, interval: 'yearly', forPerson: B }],
      [
        { amount: 6000, date: '2026-11-03' },
        { amount: 1500, date: '2026-11-05', forPerson: B },
        { amount: 9999, date: '2026-10-30' },
        { amount: 500, date: '2026-11-06', to: A },
      ],
      '2026-11',
    )
    expect(r[0]).toEqual({ person: A, fix: 52000, fixOwn: 2000, spent: 3000, spentOwn: 0, total: 55000 })
    expect(r[1]).toEqual({ person: B, fix: 51000, fixOwn: 1000, spent: 4500, spentOwn: 1500, total: 55500 })
  })
})

describe('Kategorien und Fixkosten im Stand', () => {
  it('rät Kategorien', () => {
    expect(guessExpenseCategory('Rewe Wocheneinkauf')).toBe('lebensmittel')
    expect(guessExpenseCategory('Katzenstreu')).toBe('katzen')
    expect(guessExpenseCategory('DM')).toBe('haushalt')
    expect(guessExpenseCategory('Irgendwas')).toBe('sonstiges')
  })
  it('summiert pro Kategorie im Monat', () => {
    const r = byCategory(
      [
        { amount: 3000, date: '2026-11-02', category: 'lebensmittel' },
        { amount: 1000, date: '2026-11-03', category: 'lebensmittel' },
        { amount: 500, date: '2026-11-03' },
        { amount: 9000, date: '2026-10-03', category: 'freizeit' },
        { amount: 700, date: '2026-11-04', to: A },
      ],
      '2026-11',
    )
    expect(r.map((x) => [x.category.id, x.amount])).toEqual([['lebensmittel', 4000], ['sonstiges', 500]])
  })
  it('zählt fällige Fixkosten seit Start', () => {
    expect(occurrences('2026-11', 'monthly', '2026-11-16')).toBe(1)
    expect(occurrences('2026-11', 'monthly', '2026-11-16', 20)).toBe(0)
    expect(occurrences('2026-09', 'monthly', '2026-11-16', 3)).toBe(3)
    expect(occurrences('2026-09', 'quarterly', '2026-11-16')).toBe(1)
    expect(occurrences('2026-08', 'quarterly', '2026-11-16')).toBe(2)
    expect(occurrences('2025-11', 'yearly', '2026-11-16')).toBe(2)
    expect(occurrences('2026-12', 'monthly', '2026-11-16')).toBe(0)
  })
})

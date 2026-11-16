import { describe, expect, it } from 'vitest'
import { balances, formatEuro, parseEuro, settle } from './expenses'
import { countdownText, kindInfo, SPACE_KINDS } from './spaceKinds'
import { focusRange } from './focusRange'

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

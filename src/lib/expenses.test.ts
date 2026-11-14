import { describe, expect, it } from 'vitest'
import { balances, formatEuro, parseEuro, settle } from './expenses'
import { countdownText, kindInfo, SPACE_KINDS } from './spaceKinds'

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

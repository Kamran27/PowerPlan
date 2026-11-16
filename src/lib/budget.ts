/*
 * Budget-Bereich: Fixkosten (Miete, Strom, Abos …) und Sparziele (Urlaub, Notgroschen …).
 * Beträge in Cent. Reine Rechenfunktionen – getestet in expenses.test.ts.
 */

export type BudgetInterval = 'monthly' | 'quarterly' | 'yearly'

export const INTERVALS: { value: BudgetInterval; label: string; perYear: number }[] = [
  { value: 'monthly', label: 'monatlich', perYear: 12 },
  { value: 'quarterly', label: 'vierteljährlich', perYear: 4 },
  { value: 'yearly', label: 'jährlich', perYear: 1 },
]

export interface FixCostLike {
  amount: number
  interval?: BudgetInterval
}

/** Auf den Monat umgerechnet (gerundet auf Cent) */
export function perMonth(c: FixCostLike): number {
  const perYear = INTERVALS.find((i) => i.value === (c.interval ?? 'monthly'))!.perYear
  return Math.round((c.amount * perYear) / 12)
}

export function fixTotals(costs: FixCostLike[]) {
  const month = costs.reduce((s, c) => s + perMonth(c), 0)
  return { month, year: costs.reduce((s, c) => s + c.amount * INTERVALS.find((i) => i.value === (c.interval ?? 'monthly'))!.perYear, 0) }
}

/** Nächste Fälligkeit „am X. des Monats“ ab heute (JJJJ-MM-TT); Tag wird aufs Monatsende begrenzt */
export function nextDue(day: number, today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  const pick = (yy: number, mm: number) => {
    const last = new Date(yy, mm, 0).getDate()
    return `${yy}-${String(mm).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
  }
  const thisMonth = pick(y, m)
  if (Number(thisMonth.slice(8)) >= d) return thisMonth
  return m === 12 ? pick(y + 1, 1) : pick(y, m + 1)
}

/** Fortschritt eines Sparziels in Prozent (0–100) */
export function goalPct(saved: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((saved / target) * 100))
}

/**
 * Wie viel pro Monat sparen, um das Ziel bis zum Datum zu erreichen?
 * Ohne Datum, schon erreicht oder Datum vorbei → undefined.
 */
export function monthlyToReach(saved: number, target: number, by: string | undefined, today: string): number | undefined {
  if (!by || saved >= target || by <= today) return undefined
  const [y1, m1] = today.split('-').map(Number)
  const [y2, m2] = by.split('-').map(Number)
  const months = Math.max(1, (y2 - y1) * 12 + (m2 - m1))
  return Math.ceil((target - saved) / months)
}

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
  /** Persönliche Fixkosten dieser Person. Fehlt = gemeinsam */
  owner?: string
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

/** Anteil einer Person an einem Betrag: persönlich → ganz oder gar nicht, gemeinsam → gleich geteilt */
export function shareOf(amount: number, owner: string | undefined, person: string, people: string[]): number {
  if (owner) return owner === person ? amount : 0
  const n = people.length || 1
  return Math.round(amount / n)
}

export interface PersonMonth {
  person: string
  /** Fixkosten pro Monat: persönliche + Anteil an gemeinsamen */
  fix: number
  /** davon persönlich */
  fixOwn: number
  /** Ausgaben im Monat: persönliche + Anteil an gemeinsamen */
  spent: number
  /** davon persönlich */
  spentOwn: number
  total: number
}

/**
 * Pro Person: was kostet sie dieser Monat? Fixkosten (auf den Monat umgerechnet) und
 * Ausgaben des Monats `month` ("JJJJ-MM"); Ausgleichs-Überweisungen zählen nicht.
 */
export function perPersonMonth(
  people: string[],
  fixes: FixCostLike[],
  expenses: { amount: number; date: string; to?: string; forPerson?: string }[],
  month: string,
): PersonMonth[] {
  return people.map((person) => {
    let fix = 0
    let fixOwn = 0
    for (const f of fixes) {
      const m = perMonth(f)
      fix += shareOf(m, f.owner, person, people)
      if (f.owner === person) fixOwn += m
    }
    let spent = 0
    let spentOwn = 0
    for (const e of expenses) {
      if (e.to || !e.date.startsWith(month)) continue
      spent += shareOf(e.amount, e.forPerson, person, people)
      if (e.forPerson === person) spentOwn += e.amount
    }
    return { person, fix, fixOwn, spent, spentOwn, total: fix + spent }
  })
}

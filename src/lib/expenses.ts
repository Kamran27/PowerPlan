/*
 * Kosten teilen (wie „Splitwise“, nur einfacher): Jede Ausgabe wird gleichmäßig auf alle Personen
 * im Bereich verteilt. Ein Ausgleich ist eine Überweisung von einer Person an eine andere.
 * Beträge in Cent (ganze Zahlen), damit keine Rundungsfehler entstehen.
 */

export interface ExpenseLike {
  amount: number
  paidBy: string
  /** Ausgleich: Geld von `paidBy` an `to` (keine Ausgabe) */
  to?: string
}

/** Saldo pro Person in Cent: positiv = bekommt Geld, negativ = schuldet Geld. */
export function balances(expenses: ExpenseLike[], people: string[]): Map<string, number> {
  const all = Array.from(new Set([...people, ...expenses.map((e) => e.paidBy), ...expenses.flatMap((e) => (e.to ? [e.to] : []))]))
  const bal = new Map(all.map((p) => [p, 0]))
  const add = (p: string, v: number) => bal.set(p, (bal.get(p) ?? 0) + v)
  for (const e of expenses) {
    add(e.paidBy, e.amount)
    if (e.to) {
      add(e.to, -e.amount)
      continue
    }
    const n = people.length || 1
    // Gleich aufteilen; übrige Cent bekommen die ersten Personen (Summe bleibt exakt)
    const base = Math.floor(e.amount / n)
    let rest = e.amount - base * n
    for (const p of people.length ? people : [e.paidBy]) {
      add(p, -(base + (rest > 0 ? 1 : 0)))
      if (rest > 0) rest--
    }
  }
  return bal
}

export interface Settlement {
  from: string
  to: string
  amount: number
}

/** Wenige Überweisungen, die alle Salden auf 0 bringen (Größte Schuld an größtes Guthaben). */
export function settle(bal: Map<string, number>): Settlement[] {
  const debtors = [...bal].filter(([, v]) => v < 0).map(([p, v]) => ({ p, v: -v }))
  const creditors = [...bal].filter(([, v]) => v > 0).map(([p, v]) => ({ p, v }))
  debtors.sort((a, b) => b.v - a.v)
  creditors.sort((a, b) => b.v - a.v)
  const out: Settlement[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].v, creditors[j].v)
    if (amount > 0) out.push({ from: debtors[i].p, to: creditors[j].p, amount })
    debtors[i].v -= amount
    creditors[j].v -= amount
    if (debtors[i].v === 0) i++
    if (creditors[j].v === 0) j++
  }
  return out
}

/** „12,5“ / „12,50 €“ / „1.234,99“ → Cent; ungültig → undefined */
export function parseEuro(text: string): number | undefined {
  const t = text.replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return undefined
  const cents = Math.round(parseFloat(t) * 100)
  return cents > 0 ? cents : undefined
}

export function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

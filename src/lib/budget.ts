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
  forPerson?: string
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
      fix += shareOf(m, f.forPerson, person, people)
      if (f.forPerson === person) fixOwn += m
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

/* ---------- Persönliches Budget ---------- */

/** Bereich-ID für „Mein Budget“: Einträge ohne Realm sind privat (nur für mich sichtbar) */
export const PERSONAL_SPACE_ID = 'mein'

/* ---------- Kategorien für Ausgaben ---------- */

export interface ExpenseCategory {
  id: string
  label: string
  emoji: string
  words: string[]
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'lebensmittel', label: 'Lebensmittel', emoji: '🛒', words: ['supermarkt', 'einkauf', 'edeka', 'rewe', 'lidl', 'aldi', 'netto', 'penny', 'kaufland', 'bio', 'markt', 'bäcker', 'lebensmittel', 'getränke'] },
  { id: 'haushalt', label: 'Haushalt', emoji: '🏠', words: ['dm', 'rossmann', 'drogerie', 'putz', 'ikea', 'baumarkt', 'haushalt', 'möbel', 'deko', 'reparatur'] },
  { id: 'katzen', label: 'Katzen & Tiere', emoji: '🐱', words: ['katze', 'katzen', 'futter', 'streu', 'tierarzt', 'fressnapf', 'tier'] },
  { id: 'essen', label: 'Essen gehen', emoji: '🍽️', words: ['restaurant', 'café', 'cafe', 'lieferando', 'pizza', 'döner', 'imbiss', 'essen gehen', 'sushi', 'bar'] },
  { id: 'freizeit', label: 'Freizeit', emoji: '🎉', words: ['kino', 'konzert', 'ausflug', 'museum', 'hobby', 'spiel', 'netflix', 'spotify', 'urlaub', 'reise', 'hotel', 'fitness'] },
  { id: 'kleidung', label: 'Kleidung', emoji: '👕', words: ['kleidung', 'schuhe', 'hose', 'jacke', 'shirt', 'zara', 'h&m', 'friseur'] },
  { id: 'mobilitaet', label: 'Mobilität', emoji: '🚗', words: ['tanken', 'benzin', 'diesel', 'bahn', 'ticket', 'bus', 'taxi', 'uber', 'parken', 'auto', 'werkstatt'] },
  { id: 'gesundheit', label: 'Gesundheit', emoji: '💊', words: ['apotheke', 'arzt', 'medikament', 'zahnarzt', 'brille', 'gesundheit'] },
  { id: 'geschenke', label: 'Geschenke', emoji: '🎁', words: ['geschenk', 'geburtstag', 'hochzeit', 'blumen'] },
  { id: 'sonstiges', label: 'Sonstiges', emoji: '📦', words: [] },
]

export function expenseCategory(id?: string): ExpenseCategory {
  return EXPENSE_CATEGORIES.find((c) => c.id === id) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
}

/** Kategorie aus dem Text raten („Rewe“ → Lebensmittel); längstes passendes Stichwort gewinnt */
export function guessExpenseCategory(title: string): string {
  const t = title.trim().toLowerCase()
  const tokens = t.split(/[\s,.-]+/)
  let best: { id: string; len: number } | undefined
  for (const c of EXPENSE_CATEGORIES) {
    for (const w of c.words) {
      const hit = w.length <= 3 ? tokens.includes(w) : t.includes(w)
      if (hit && (!best || w.length > best.len)) best = { id: c.id, len: w.length }
    }
  }
  return best?.id ?? 'sonstiges'
}

/** Kategorie einer Ausgabe: gewählt, sonst aus dem Text geraten (ältere Einträge ohne Kategorie) */
export function categoryOf(e: { category?: string; title?: string }): ExpenseCategory {
  return expenseCategory(e.category ?? (e.title ? guessExpenseCategory(e.title) : undefined))
}

/** Summe pro Kategorie im Monat, größte zuerst (Ausgleiche zählen nicht) */
export function byCategory(expenses: { amount: number; date: string; to?: string; category?: string; title?: string }[], month: string) {
  const sums = new Map<string, number>()
  for (const e of expenses) {
    if (e.to || !e.date.startsWith(month)) continue
    const c = categoryOf(e).id
    sums.set(c, (sums.get(c) ?? 0) + e.amount)
  }
  return [...sums].map(([id, amount]) => ({ category: expenseCategory(id), amount })).sort((a, b) => b.amount - a.amount)
}

/* ---------- Gemeinsame Fixkosten im „Wer schuldet wem“ ---------- */

/**
 * Wie oft wurde eine Fixkosten-Position seit `since` ("JJJJ-MM") bis heute fällig?
 * Monatlich jeden Monat, vierteljährlich alle 3, jährlich alle 12 Monate (ab dem Startmonat).
 * Im aktuellen Monat erst ab dem Fälligkeitstag (ohne Tag: ab dem 1.).
 */
export function occurrences(since: string, interval: BudgetInterval | undefined, today: string, day?: number): number {
  const [sy, sm] = since.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  let months = (ty - sy) * 12 + (tm - sm) // volle Monate seit Start
  if (months < 0) return 0
  const step = interval === 'yearly' ? 12 : interval === 'quarterly' ? 3 : 1
  const dueThisMonth = months % step === 0
  if (dueThisMonth && day && td < day) months -= 1 // diesen Monat noch nicht fällig
  return Math.floor(months / step) + 1
}

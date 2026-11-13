import type { ShoppingItem } from '../db'

/*
 * Einkaufen leicht gemacht:
 * - Kategorien in typischer Laden-Reihenfolge (Eingang → Kasse), damit die Liste dem Weg durch den Markt folgt
 * - Kategorie wird aus dem Artikelnamen geraten; einmal geändert, merkt sich die App die Wahl (aus früheren Artikeln)
 * - Vorschläge: schon einmal gekaufte Artikel, die gerade nicht auf der Liste stehen
 */

export interface Category {
  id: string
  label: string
  emoji: string
  /** Wortteile (klein geschrieben), an denen die Kategorie erkannt wird */
  words: string[]
}

export const CATEGORIES: Category[] = [
  { id: 'obst', label: 'Obst & Gemüse', emoji: '🥦', words: ['apfel', 'äpfel', 'banane', 'birne', 'orange', 'zitrone', 'limette', 'traube', 'beere', 'kiwi', 'mango', 'melone', 'ananas', 'tomate', 'gurke', 'paprika', 'salat', 'zwiebel', 'knoblauch', 'kartoffel', 'karotte', 'möhre', 'brokkoli', 'blumenkohl', 'zucchini', 'aubergine', 'pilz', 'champignon', 'spinat', 'avocado', 'kohl', 'lauch', 'porree', 'ingwer', 'petersilie', 'basilikum', 'dill', 'kräuter', 'radieschen', 'sellerie', 'obst', 'gemüse', 'mais'] },
  { id: 'brot', label: 'Brot & Backwaren', emoji: '🥖', words: ['brot', 'brötchen', 'toast', 'baguette', 'croissant', 'brezel', 'semmel', 'kuchen', 'wrap', 'tortilla', 'fladen', 'lavash'] },
  { id: 'kuehl', label: 'Kühlregal', emoji: '🧀', words: ['milch', 'joghurt', 'jogurt', 'quark', 'käse', 'butter', 'sahne', 'schmand', 'frischkäse', 'mozzarella', 'feta', 'ei', 'eier', 'margarine', 'kefir', 'ayran', 'pudding', 'skyr', 'aufstrich', 'hummus', 'tofu'] },
  { id: 'fleisch', label: 'Fleisch & Fisch', emoji: '🥩', words: ['fleisch', 'hähnchen', 'huhn', 'hühnchen', 'pute', 'rind', 'hack', 'lamm', 'schwein', 'wurst', 'salami', 'schinken', 'fisch', 'lachs', 'thunfisch', 'garnele', 'steak', 'filet', 'sucuk', 'aufschnitt'] },
  { id: 'tk', label: 'Tiefkühl', emoji: '🧊', words: ['tk', 'tiefkühl', 'eis', 'pizza', 'pommes', 'gefroren'] },
  { id: 'vorrat', label: 'Vorrat & Konserven', emoji: '🥫', words: ['nudel', 'pasta', 'spaghetti', 'reis', 'mehl', 'zucker', 'salz', 'pfeffer', 'gewürz', 'öl', 'olivenöl', 'rapsöl', 'sonnenblumenöl', 'essig', 'konserve', 'dose', 'bohne', 'linse', 'kichererbse', 'soße', 'sauce', 'ketchup', 'senf', 'mayo', 'brühe', 'honig', 'marmelade', 'nutella', 'müsli', 'haferflocken', 'cornflakes', 'tee', 'kaffee', 'bulgur', 'couscous', 'passata', 'tomatenmark', 'lasagne', 'tortellini', 'gnocchi', 'backpulver', 'hefe'] },
  { id: 'snacks', label: 'Süßes & Snacks', emoji: '🍫', words: ['schokolade', 'schoko', 'chips', 'keks', 'kekse', 'gummibär', 'bonbon', 'nüsse', 'nuss', 'cracker', 'riegel', 'popcorn', 'süß'] },
  { id: 'getraenke', label: 'Getränke', emoji: '🥤', words: ['wasser', 'saft', 'cola', 'limo', 'bier', 'wein', 'sprudel', 'sprite', 'fanta', 'eistee', 'getränk', 'mineral', 'orangensaft', 'apfelsaft', 'apfelschorle'] },
  { id: 'drogerie', label: 'Drogerie & Haushalt', emoji: '🧴', words: ['shampoo', 'seife', 'duschgel', 'zahnpasta', 'zahnbürste', 'deo', 'creme', 'toilettenpapier', 'klopapier', 'küchenrolle', 'taschentuch', 'spülmittel', 'waschmittel', 'tabs', 'müllbeutel', 'müllsack', 'windel', 'feuchttücher', 'putzmittel', 'reiniger', 'schwamm', 'alufolie', 'frischhaltefolie', 'backpapier', 'batterie', 'rasier', 'watte', 'tampon', 'binde', 'pflaster'] },
  { id: 'sonstiges', label: 'Sonstiges', emoji: '📦', words: [] },
]

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))
const ORDER = new Map(CATEGORIES.map((c, i) => [c.id, i]))

export function categoryInfo(id?: string): Category {
  return BY_ID.get(id ?? '') ?? BY_ID.get('sonstiges')!
}

export function categoryOrder(id?: string): number {
  return ORDER.get(id ?? 'sonstiges') ?? CATEGORIES.length
}

const norm = (s: string) => s.trim().toLowerCase()

/**
 * Rät die Kategorie aus dem Namen: das längste passende Stichwort gewinnt
 * („Eistee“ → Getränke statt Tiefkühl, „Tomatenmark“ → Vorrat statt Obst & Gemüse).
 */
export function guessCategory(name: string): string {
  const n = norm(name)
  const tokens = n.split(/[\s,.-]+/)
  let best: { id: string; len: number } | undefined
  for (const c of CATEGORIES) {
    for (const w of c.words) {
      // Kurze Stichwörter (z. B. „ei“, „eis“, „tk“) nur als ganzes Wort, sonst passt „Eis“ in „Reis“
      const hit = w.length <= 3 ? tokens.includes(w) : n.includes(w)
      if (hit && (!best || w.length > best.len)) best = { id: c.id, len: w.length }
    }
  }
  return best?.id ?? 'sonstiges'
}

/** Kategorie eines Artikels: gespeichert, sonst geraten (für ältere Artikel ohne Kategorie). */
export function itemCategory(item: Pick<ShoppingItem, 'category' | 'name'>): string {
  return item.category ?? guessCategory(item.name)
}

export interface Suggestion {
  name: string
  qty?: string
  category: string
  /** Wie oft schon auf einer Liste */
  count: number
  last: string
}

/**
 * Früher gekaufte Artikel eines Bereichs, zusammengefasst nach Namen (ohne Groß/klein),
 * mit zuletzt verwendeter Menge und Kategorie. Häufigste zuerst.
 */
export function buildHistory(items: ShoppingItem[]): Suggestion[] {
  const map = new Map<string, Suggestion>()
  for (const i of items) {
    const key = norm(i.name)
    const s = map.get(key)
    if (!s) {
      map.set(key, { name: i.name.trim(), qty: i.qty, category: itemCategory(i), count: 1, last: i.createdAt })
    } else {
      s.count++
      if (i.createdAt > s.last) {
        Object.assign(s, { name: i.name.trim(), qty: i.qty, category: itemCategory(i), last: i.createdAt })
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
}

/** Vorschläge passend zur Eingabe (Wortanfang zuerst), ohne Artikel, die schon offen auf der Liste stehen. */
export function suggest(history: Suggestion[], openNames: Set<string>, input: string, max = 6): Suggestion[] {
  const q = norm(input)
  const free = history.filter((s) => !openNames.has(norm(s.name)))
  if (!q) return free.slice(0, max)
  const starts = free.filter((s) => norm(s.name).startsWith(q))
  const contains = free.filter((s) => !norm(s.name).startsWith(q) && norm(s.name).includes(q))
  return [...starts, ...contains].filter((s) => norm(s.name) !== q).slice(0, max)
}

/** Gemerkte Kategorie für einen Namen (aus der Historie), sonst geraten. */
export function categoryFor(name: string, history: Suggestion[]): string {
  return history.find((s) => norm(s.name) === norm(name))?.category ?? guessCategory(name)
}

export { norm as normalizeName }

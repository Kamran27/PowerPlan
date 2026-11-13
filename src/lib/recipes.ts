import { db, type Ingredient, type Recipe, type ShoppingList, type Space } from '../db'
import { addShoppingItem } from './spaces'
import { guessCategory, normalizeName } from './shopping'

/*
 * Rezepte: Zutaten einmal speichern, dann mit einem Tipp (auf Wunsch für mehr/weniger Personen)
 * auf die Einkaufsliste setzen. Ohne KI – die Mengen werden einfach umgerechnet.
 */

const UNITS =
  'g|kg|mg|ml|l|cl|dl|el|tl|stk|stück|pck|packung|packungen|pkg|dose|dosen|bund|prise|prisen|becher|zehe|zehen|scheibe|scheiben|glas|gläser|flasche|flaschen|tasse|tassen|kopf|köpfe|beutel|netz|würfel|blatt|blätter|handvoll'
const NUMBER = '\\d+(?:[.,]\\d+)?|\\d+\\/\\d+|[½¼¾⅓⅔]'

/** „500 g Hackfleisch“ → { qty: "500 g", name: "Hackfleisch" }; „Salz“ → { name: "Salz" } */
export function parseIngredientLine(line: string): Ingredient | null {
  const s = line.replace(/^[-•*\s]+/, '').trim()
  if (!s) return null
  const m = s.match(new RegExp(`^((?:${NUMBER})(?:\\s*(?:-|–|bis)\\s*(?:${NUMBER}))?\\s*(?:(?:${UNITS})\\.?(?![\\p{L}]))?)\\s+(.+)$`, 'iu'))
  const ing = m ? { qty: m[1].trim(), name: m[2].trim() } : { name: s }
  let category = guessCategory(ing.name)
  // „1 Dose Tomaten“, „1 Glas Gurken“ gibt es im Vorratsregal, nicht beim frischen Gemüse
  if (category === 'obst' && ing.qty && /(dose|glas|gläser)/i.test(ing.qty)) category = 'vorrat'
  return { ...ing, category }
}

export function parseIngredients(text: string): Ingredient[] {
  return text
    .split('\n')
    .map(parseIngredientLine)
    .filter((i): i is Ingredient => !!i)
}

export function ingredientsToText(list: Ingredient[]): string {
  return list.map((i) => (i.qty ? `${i.qty} ${i.name}` : i.name)).join('\n')
}

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }

function toNumber(s: string): number {
  if (FRACTIONS[s] !== undefined) return FRACTIONS[s]
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number)
    return b ? a / b : NaN
  }
  return Number(s.replace(',', '.'))
}

// Einheiten, die man nur ganz kauft (Stück, Dose, Bund …) → aufrunden
const COUNTABLE = /^(|stk\.?|stück|pck\.?|packung(en)?|pkg|dose(n)?|bund|becher|glas|gläser|flasche(n)?|kopf|köpfe|beutel|netz|würfel)$/i

function format(n: number): string {
  const r = Math.round(n * 10) / 10
  return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace('.', ',')
}

/** Menge umrechnen: „500 g“ × 1,5 → „750 g“, „2“ × 0,5 → „1“, „1 Dose“ × 1,5 → „2 Dose“; „etwas“ bleibt. */
export function scaleQty(qty: string | undefined, factor: number): string | undefined {
  if (!qty || factor === 1) return qty
  const m = qty.match(new RegExp(`^(${NUMBER})(?:\\s*(?:-|–|bis)\\s*(${NUMBER}))?\\s*(.*)$`, 'u'))
  if (!m) return qty
  let unit = m[3].trim()
  const values = [m[1], m[2]].filter(Boolean).map((s) => {
    let v = toNumber(s) * factor
    if (Number.isNaN(v)) return NaN
    if (COUNTABLE.test(unit)) v = Math.ceil(v - 1e-9)
    else if (/^(g|ml)$/i.test(unit) && v >= 50) v = Math.round(v / 5) * 5
    return v
  })
  if (values.some(Number.isNaN)) return qty
  // 1000 g → 1 kg, 1500 ml → 1,5 l
  if (/^(g|ml)$/i.test(unit) && values.every((v) => v >= 1000)) {
    unit = unit.toLowerCase() === 'g' ? 'kg' : 'l'
    values.forEach((v, i) => (values[i] = v / 1000))
  }
  const [a, b] = values.map(format)
  const amount = b && b !== a ? `${a}–${b}` : a
  return unit ? `${amount} ${unit}` : amount
}

export async function addRecipe(space: Space, data: { title: string; servings: number; ingredients: Ingredient[] }) {
  return db.recipes.add({
    spaceId: space.id,
    realmId: space.realmId,
    title: data.title.trim(),
    servings: data.servings,
    ingredients: data.ingredients,
    createdAt: new Date().toISOString(),
  } as Recipe)
}

export async function updateRecipe(id: string, data: { title: string; servings: number; ingredients: Ingredient[] }) {
  await db.recipes.update(id, { title: data.title.trim(), servings: data.servings, ingredients: data.ingredients })
}

export async function deleteRecipe(id: string) {
  await db.recipes.delete(id)
}

/**
 * Setzt die ausgewählten Zutaten (umgerechnet auf `servings` Personen) auf die Liste.
 * Was dort schon offen steht, wird übersprungen. Gibt die Anzahl hinzugefügter Artikel zurück.
 */
export async function addRecipeToList(list: ShoppingList, recipe: Recipe, servings: number, selected: Ingredient[]): Promise<number> {
  const factor = servings / (recipe.servings || 1)
  const open = await db.shoppingItems.where('listId').equals(list.id).filter((i) => !i.done && !i.cleared).toArray()
  const openNames = new Set(open.map((i) => normalizeName(i.name)))
  let added = 0
  for (const ing of selected) {
    if (openNames.has(normalizeName(ing.name))) continue
    await addShoppingItem(list, ing.name, scaleQty(ing.qty, factor), ing.category ?? guessCategory(ing.name))
    added++
  }
  return added
}

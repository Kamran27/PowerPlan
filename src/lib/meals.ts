import { db, type Ingredient, type Meal, type Recipe, type Space } from '../db'
import { combineIngredients, scaleQty } from './recipes'

/*
 * Essensplan: pro Bereich und Tag ein oder mehrere Gerichte – aus einem Rezept oder frei eingetragen.
 * Die Zutaten aller Rezept-Gerichte lassen sich zusammengerechnet auf die Einkaufsliste setzen.
 */

export async function addMeal(space: Space, date: string, data: { title: string; recipeId?: string; servings: number }) {
  await db.meals.add({
    spaceId: space.id,
    realmId: space.realmId,
    date,
    title: data.title.trim(),
    ...(data.recipeId ? { recipeId: data.recipeId } : {}),
    servings: data.servings,
    createdAt: new Date().toISOString(),
  } as Meal)
}


export async function deleteMeal(id: string) {
  await db.meals.delete(id)
}

/** Alle Zutaten der Gerichte – je Gericht auf dessen Personenzahl umgerechnet, dann zusammengefasst. */
export function ingredientsForMeals(meals: Meal[], recipes: Recipe[]): Ingredient[] {
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const all: Ingredient[] = []
  for (const m of meals) {
    const r = m.recipeId ? byId.get(m.recipeId) : undefined
    if (!r) continue
    const factor = m.servings / (r.servings || 1)
    for (const ing of r.ingredients) all.push({ ...ing, qty: scaleQty(ing.qty, factor) })
  }
  return combineIngredients(all)
}

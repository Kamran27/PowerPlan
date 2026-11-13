import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db, type Meal, type Recipe, type ShoppingList, type Space } from '../db'
import { addDays, isoWeekNumber, todayISO } from '../lib/date'
import { addMeal, deleteMeal, ingredientsForMeals } from '../lib/meals'
import { weekStart } from '../lib/points'
import { addIngredientsToList } from '../lib/recipes'
import { categoryInfo, normalizeName } from '../lib/shopping'
import { useToast } from './Toast'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
const field = 'rounded-lg border border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-800'

function dayLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })
}

/** Wochen-Essensplan eines Bereichs: Gerichte pro Tag planen und alle Zutaten auf einmal einkaufen. */
export default function MealPlanView({ space, lists }: { space: Space; lists: ShoppingList[] }) {
  const today = todayISO()
  const [monday, setMonday] = useState(() => weekStart(today))
  const sunday = addDays(monday, 6)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const meals = useLiveQuery(
    () => db.meals.where('[spaceId+date]').between([space.id, monday], [space.id, sunday], true, true).sortBy('createdAt'),
    [space.id, monday, sunday],
  )
  const recipes = useLiveQuery(() => db.recipes.where('spaceId').equals(space.id).sortBy('title'), [space.id]) ?? []
  const [addingFor, setAddingFor] = useState<string>()
  const [shopping, setShopping] = useState(false)

  // Einkaufen: nur Gerichte ab heute (Vergangenes ist schon gegessen)
  const upcoming = (meals ?? []).filter((m) => m.date >= today)

  return (
    <>
      <section className={card}>
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setMonday(addDays(monday, -7))} aria-label="Vorige Woche" className="rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            ‹
          </button>
          <div className="text-center">
            <h2 className="font-semibold">🍽️ Essensplan · KW {isoWeekNumber(monday)}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dayLabel(monday)} – {dayLabel(sunday)}
              {monday !== weekStart(today) && (
                <button onClick={() => setMonday(weekStart(today))} className="ml-2 text-indigo-600 hover:underline dark:text-indigo-400">
                  Diese Woche
                </button>
              )}
            </p>
          </div>
          <button onClick={() => setMonday(addDays(monday, 7))} aria-label="Nächste Woche" className="rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            ›
          </button>
        </div>

        <ul className="mt-4 grid gap-1">
          {days.map((d) => {
            const dayMeals = (meals ?? []).filter((m) => m.date === d)
            const isToday = d === today
            return (
              <li
                key={d}
                className={`rounded-xl px-3 py-2 ${isToday ? 'bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:ring-indigo-500/30' : ''} ${d < today ? 'opacity-60' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`w-20 shrink-0 text-sm ${isToday ? 'font-semibold text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {isToday ? 'Heute' : dayLabel(d)}
                  </span>
                  {dayMeals.map((m) => (
                    <MealChip key={m.id} meal={m} hasRecipe={!!m.recipeId && recipes.some((r) => r.id === m.recipeId)} />
                  ))}
                  {addingFor !== d && (
                    <button
                      onClick={() => setAddingFor(d)}
                      aria-label={`Gericht für ${dayLabel(d)} planen`}
                      className="rounded-full px-2.5 py-0.5 text-sm border border-dashed border-slate-300 text-slate-400 hover:text-slate-600 dark:border-slate-600"
                    >
                      +
                    </button>
                  )}
                </div>
                {addingFor === d && <AddMealForm space={space} date={d} recipes={recipes} onDone={() => setAddingFor(undefined)} />}
              </li>
            )
          })}
        </ul>

        {recipes.length === 0 && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Tipp: Unter 🛒 Einkauf → 📖 Rezepte gespeicherte Gerichte bringen ihre Zutaten gleich mit.
          </p>
        )}

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            onClick={() => setShopping((s) => !s)}
            disabled={!upcoming.some((m) => m.recipeId)}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-40"
          >
            🛒 Zutaten {monday === weekStart(today) ? 'ab heute' : 'dieser Woche'} einkaufen
          </button>
        </div>
      </section>

      {shopping && <WeekShopping meals={upcoming} recipes={recipes} lists={lists} onDone={() => setShopping(false)} />}
    </>
  )
}

function MealChip({ meal, hasRecipe }: { meal: Meal; hasRecipe: boolean }) {
  return (
    <span className="group inline-flex items-center gap-1 rounded-full bg-orange-50 py-0.5 pr-1 pl-2.5 text-sm text-orange-900 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-100 dark:ring-orange-500/30">
      {hasRecipe ? '📖' : '🍴'} {meal.title}
      <span className="text-xs text-orange-700/70 dark:text-orange-200/60">· {meal.servings}</span>
      <button
        onClick={() => deleteMeal(meal.id)}
        aria-label={`${meal.title} entfernen`}
        className="rounded-full px-1 text-orange-400 hover:text-rose-600"
      >
        ✕
      </button>
    </span>
  )
}

function AddMealForm({ space, date, recipes, onDone }: { space: Space; date: string; recipes: Recipe[]; onDone: () => void }) {
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const recipe = recipes.find((r) => r.id === recipeId)
  const [servings, setServings] = useState(recipe?.servings ?? 2)

  async function save(e: FormEvent) {
    e.preventDefault()
    const name = recipe ? recipe.title : title.trim()
    if (!name) return
    await addMeal(space, date, { title: name, recipeId: recipe?.id, servings })
    onDone()
  }

  return (
    <form onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && onDone()} className="mt-2 flex flex-wrap items-center gap-2">
      <select
        value={recipeId}
        onChange={(e) => {
          setRecipeId(e.target.value)
          const r = recipes.find((x) => x.id === e.target.value)
          if (r) setServings(r.servings)
        }}
        aria-label="Gericht"
        className={`${field} px-2 py-1.5`}
      >
        {recipes.map((r) => (
          <option key={r.id} value={r.id}>
            📖 {r.title}
          </option>
        ))}
        <option value="">🍴 Eigenes Gericht …</option>
      </select>
      {!recipe && (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Pizza bestellen"
          aria-label="Gericht"
          className={`${field} min-w-0 flex-1 px-2 py-1.5`}
        />
      )}
      <label className="flex items-center gap-1 text-sm">
        für
        <input
          type="number"
          min={1}
          max={50}
          value={servings}
          onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))}
          aria-label="Personen"
          className={`${field} w-14 px-2 py-1.5`}
        />
      </label>
      <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500">OK</button>
      <button type="button" onClick={onDone} className="text-sm text-slate-500 hover:underline">
        Abbrechen
      </button>
    </form>
  )
}

/** Alle Zutaten der geplanten Gerichte zusammengerechnet – auswählen und auf eine Liste setzen. */
function WeekShopping({ meals, recipes, lists, onDone }: { meals: Meal[]; recipes: Recipe[]; lists: ShoppingList[]; onDone: () => void }) {
  const [listId, setListId] = useState(lists[0]?.id ?? '')
  const list = lists.find((l) => l.id === listId)
  const openNames = useLiveQuery(
    async () =>
      list
        ? new Set((await db.shoppingItems.where('listId').equals(list.id).filter((i) => !i.done && !i.cleared).toArray()).map((i) => normalizeName(i.name)))
        : new Set<string>(),
    [list?.id],
  )
  const ingredients = ingredientsForMeals(meals, recipes)
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set())
  const toast = useToast()
  const withoutRecipe = meals.filter((m) => !m.recipeId || !recipes.some((r) => r.id === m.recipeId))

  // Vorausgewählt: alles, was noch nicht offen auf der Liste steht
  const isChecked = (name: string) => !unchecked.has(normalizeName(name)) && !openNames?.has(normalizeName(name))
  const chosen = ingredients.filter((i) => isChecked(i.name))

  async function add() {
    if (!list) return
    const n = await addIngredientsToList(list, chosen)
    toast(n ? `🛒 ${n} ${n === 1 ? 'Zutat' : 'Zutaten'} auf „${list.title}“` : 'Alles steht schon auf der Liste.')
    onDone()
  }

  return (
    <section className={`${card} mt-4`}>
      <h2 className="font-semibold">🛒 Einkauf für {meals.filter((m) => m.recipeId).length} Gerichte</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Gleiche Zutaten sind zusammengerechnet. Abwählen, was ihr zu Hause habt.</p>
      <ul className="mt-3 grid gap-1">
        {ingredients.map((ing) => {
          const key = normalizeName(ing.name)
          const onList = openNames?.has(key)
          return (
            <li key={key}>
              <label className={`flex items-center gap-2 text-sm ${onList ? 'opacity-60' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  disabled={onList}
                  checked={isChecked(ing.name)}
                  onChange={() =>
                    setUnchecked((s) => {
                      const n = new Set(s)
                      if (n.has(key)) n.delete(key)
                      else n.add(key)
                      return n
                    })
                  }
                  className="size-4 accent-orange-500"
                />
                <span aria-hidden>{categoryInfo(ing.category).emoji}</span>
                {ing.qty && <span className="font-semibold text-slate-600 tabular-nums dark:text-slate-300">{ing.qty}</span>}
                <span>{ing.name}</span>
                {onList && <span className="text-xs text-slate-500">· steht schon auf der Liste</span>}
              </label>
            </li>
          )
        })}
      </ul>
      {withoutRecipe.length > 0 && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Ohne Rezept (keine Zutaten): {withoutRecipe.map((m) => m.title).join(', ')}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {lists.length > 1 && (
          <select value={listId} onChange={(e) => setListId(e.target.value)} aria-label="Einkaufsliste" className={`${field} px-2 py-1.5`}>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={add}
          disabled={!list || chosen.length === 0}
          className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-40"
        >
          🛒 {chosen.length} {chosen.length === 1 ? 'Zutat' : 'Zutaten'} auf „{list?.title ?? 'Liste'}“
        </button>
        <button onClick={onDone} className="text-sm text-slate-500 hover:underline">
          Schließen
        </button>
      </div>
      {!list && <p className="mt-2 text-xs text-rose-600">Lege zuerst unter 🛒 Einkauf eine Liste an.</p>}
    </section>
  )
}

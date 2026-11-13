import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db, type Recipe, type ShoppingList, type Space } from '../db'
import {
  addRecipe,
  addRecipeToList,
  deleteRecipe,
  ingredientsToText,
  parseIngredients,
  scaleQty,
  updateRecipe,
} from '../lib/recipes'
import { categoryInfo, normalizeName } from '../lib/shopping'
import { useToast } from './Toast'

const field = 'rounded-lg border border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-800'

/** Rezepte eines Bereichs: anlegen, bearbeiten und Zutaten mit einem Tipp auf die aktuelle Einkaufsliste setzen. */
export default function RecipesPanel({ space, list }: { space: Space; list?: ShoppingList }) {
  const recipes = useLiveQuery(() => db.recipes.where('spaceId').equals(space.id).sortBy('title'), [space.id])
  const [openId, setOpenId] = useState<string>()
  const [editing, setEditing] = useState<Recipe | 'new'>()

  const open = recipes?.find((r) => r.id === openId)

  return (
    <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">📖 Rezepte</h2>
        {!editing && (
          <button onClick={() => setEditing('new')} className="rounded-full px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            + Rezept
          </button>
        )}
      </div>

      {editing ? (
        <RecipeEditor
          space={space}
          recipe={editing === 'new' ? undefined : editing}
          onDone={(id) => {
            setEditing(undefined)
            if (id) setOpenId(id)
          }}
        />
      ) : (
        <>
          {recipes && recipes.length === 0 && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Speichert eure Lieblingsgerichte mit Zutaten – dann kommt alles mit einem Tipp auf die Einkaufsliste.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(recipes ?? []).map((r) => (
              <button
                key={r.id}
                onClick={() => setOpenId(r.id === openId ? undefined : r.id)}
                aria-pressed={r.id === openId}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  r.id === openId
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                {r.title}
              </button>
            ))}
          </div>
          {open && <RecipeDetail key={open.id} recipe={open} list={list} onEdit={() => setEditing(open)} onDeleted={() => setOpenId(undefined)} />}
        </>
      )}
    </section>
  )
}

type DetailProps = { recipe: Recipe; list?: ShoppingList; onEdit: () => void; onDeleted: () => void }

/** Lädt erst, was schon auf der Liste steht – damit die Auswahl richtig vorbelegt ist. */
function RecipeDetail(props: DetailProps) {
  const { list } = props
  const openOnList = useLiveQuery(
    async () =>
      list
        ? new Set((await db.shoppingItems.where('listId').equals(list.id).filter((i) => !i.done && !i.cleared).toArray()).map((i) => normalizeName(i.name)))
        : new Set<string>(),
    [list?.id],
  )
  if (!openOnList) return null
  return <RecipeDetailBody {...props} openOnList={openOnList} />
}

function RecipeDetailBody({ recipe, list, onEdit, onDeleted, openOnList }: DetailProps & { openOnList: Set<string> }) {
  const [servings, setServings] = useState(recipe.servings)
  const toast = useToast()
  // Was schon offen auf der Liste steht, ist vorab abgewählt
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(recipe.ingredients.map((_, i) => i).filter((i) => !openOnList.has(normalizeName(recipe.ingredients[i].name)))),
  )

  const factor = servings / (recipe.servings || 1)

  async function addToList() {
    if (!list) return
    const chosen = recipe.ingredients.filter((_, i) => selected.has(i))
    const n = await addRecipeToList(list, recipe, servings, chosen)
    toast(n ? `🛒 ${n} ${n === 1 ? 'Zutat' : 'Zutaten'} auf „${list.title}“` : 'Alles steht schon auf der Liste.')
  }

  return (
    <div className="mt-4 rounded-xl bg-orange-50/60 p-4 ring-1 ring-orange-200 dark:bg-orange-500/5 dark:ring-orange-500/30">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold">{recipe.title}</h3>
        <div className="flex items-center gap-1 text-sm" role="group" aria-label="Personen">
          <button
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            aria-label="Eine Person weniger"
            className="size-7 rounded-full ring-1 ring-slate-300 hover:bg-white dark:ring-slate-600 dark:hover:bg-slate-800"
          >
            −
          </button>
          <span className="w-24 text-center tabular-nums">
            {servings} {servings === 1 ? 'Person' : 'Personen'}
          </span>
          <button
            onClick={() => setServings((s) => s + 1)}
            aria-label="Eine Person mehr"
            className="size-7 rounded-full ring-1 ring-slate-300 hover:bg-white dark:ring-slate-600 dark:hover:bg-slate-800"
          >
            +
          </button>
        </div>
        <div className="ml-auto flex gap-3 text-xs">
          <button onClick={onEdit} className="text-slate-500 hover:underline">
            Bearbeiten
          </button>
          <button
            onClick={async () => {
              if (!window.confirm(`Rezept „${recipe.title}“ löschen?`)) return
              await deleteRecipe(recipe.id)
              onDeleted()
            }}
            className="text-rose-600 hover:underline dark:text-rose-400"
          >
            Löschen
          </button>
        </div>
      </div>

      <ul className="mt-3 grid gap-1">
        {recipe.ingredients.map((ing, i) => {
          const onList = openOnList.has(normalizeName(ing.name))
          return (
            <li key={i}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() =>
                    setSelected((s) => {
                      const n = new Set(s)
                      if (n.has(i)) n.delete(i)
                      else n.add(i)
                      return n
                    })
                  }
                  className="size-4 accent-orange-500"
                />
                <span aria-hidden>{categoryInfo(ing.category).emoji}</span>
                {ing.qty && <span className="font-semibold text-slate-600 tabular-nums dark:text-slate-300">{scaleQty(ing.qty, factor)}</span>}
                <span>{ing.name}</span>
                {onList && <span className="text-xs text-slate-500 dark:text-slate-400">· steht schon auf der Liste</span>}
              </label>
            </li>
          )
        })}
      </ul>

      <button
        onClick={addToList}
        disabled={!list || selected.size === 0}
        className="mt-3 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-40"
      >
        🛒 {selected.size} {selected.size === 1 ? 'Zutat' : 'Zutaten'} auf „{list?.title ?? 'Liste'}“
      </button>
    </div>
  )
}

function RecipeEditor({ space, recipe, onDone }: { space: Space; recipe?: Recipe; onDone: (id?: string) => void }) {
  const [title, setTitle] = useState(recipe?.title ?? '')
  const [servings, setServings] = useState(recipe?.servings ?? 2)
  const [text, setText] = useState(recipe ? ingredientsToText(recipe.ingredients) : '')
  const preview = parseIngredients(text)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || preview.length === 0) return
    // Gespeicherte (evtl. angepasste) Abteilungen gleichnamiger Zutaten behalten
    const ingredients = preview.map((p) => {
      const old = recipe?.ingredients.find((o) => normalizeName(o.name) === normalizeName(p.name))
      return old?.category ? { ...p, category: old.category } : p
    })
    const data = { title, servings, ingredients }
    if (recipe) {
      await updateRecipe(recipe.id, data)
      onDone(recipe.id)
    } else {
      onDone(await addRecipe(space, data))
    }
  }

  return (
    <form onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && onDone()} className="mt-3 grid gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name, z. B. Lasagne"
          aria-label="Name des Rezepts"
          className={`${field} min-w-0 flex-1 px-3 py-2`}
        />
        <label className="flex items-center gap-1 text-sm">
          für
          <input
            type="number"
            min={1}
            max={50}
            value={servings}
            onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))}
            aria-label="Personen"
            className={`${field} w-16 px-2 py-2`}
          />
          Personen
        </label>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder={'Eine Zutat pro Zeile, Menge vorne:\n500 g Hackfleisch\n1 Dose Tomaten\n2 Zwiebeln\nSalz'}
        aria-label="Zutaten"
        className={`${field} resize-y px-3 py-2 font-mono`}
      />
      {preview.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {preview.length} Zutaten erkannt: {preview.map((p) => `${categoryInfo(p.category).emoji} ${p.qty ? p.qty + ' ' : ''}${p.name}`).join(' · ')}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => onDone()} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={!title.trim() || preview.length === 0}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
    </form>
  )
}

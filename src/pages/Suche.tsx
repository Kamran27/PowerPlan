import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import TaskList from '../components/TaskList'
import { db } from '../db'
import { compareTasks } from '../lib/tasks'
import { formatDayShort } from '../lib/date'
import { SittingCat } from '../components/Cats'

const card = 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/** Alle Wörter der Suche müssen vorkommen (Groß/klein egal). */
function matcher(q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  return (...texts: (string | undefined)[]) => {
    if (!words.length) return false
    const hay = texts.filter(Boolean).join(' ').toLowerCase()
    return words.every((w) => hay.includes(w))
  }
}

/** Suche über alles: Aufgaben (inkl. Notizen und Checklisten), Einkauf, Rezepte, Essensplan, Gewohnheiten, Ziele. */
export default function Suche() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const items = useLiveQuery(() => db.shoppingItems.filter((i) => !i.cleared).toArray(), [])
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const meals = useLiveQuery(() => db.meals.toArray(), [])
  const habits = useLiveQuery(() => db.habits.toArray(), [])
  const goals = useLiveQuery(() => db.goals.toArray(), [])
  const spaces = useLiveQuery(() => db.spaces.toArray(), [])

  const r = useMemo(() => {
    const m = matcher(q)
    const spaceName = new Map((spaces ?? []).map((s) => [s.id, `${s.emoji ?? '👥'} ${s.title}`]))
    return {
      spaceName,
      tasks: (tasks ?? []).filter((t) => m(t.title, t.notes, ...(t.subtasks ?? []).map((s) => s.title))).sort(compareTasks),
      items: (items ?? []).filter((i) => m(i.name, i.qty)),
      recipes: (recipes ?? []).filter((x) => m(x.title, ...x.ingredients.map((i) => i.name))),
      meals: (meals ?? []).filter((x) => m(x.title)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
      habits: (habits ?? []).filter((h) => m(h.name)),
      goals: (goals ?? []).filter((g) => m(g.title)),
    }
  }, [q, tasks, items, recipes, meals, habits, goals, spaces])

  // Erst „nichts gefunden“ sagen, wenn alles geladen ist
  const loaded = [tasks, items, recipes, meals, habits, goals, spaces].every((x) => x !== undefined)
  const total = r.tasks.length + r.items.length + r.recipes.length + r.meals.length + r.habits.length + r.goals.length

  return (
    <div className="max-w-3xl">
      <PageHeader title="Suche" subtitle="Aufgaben, Notizen, Checklisten, Einkauf, Rezepte, Essensplan, Gewohnheiten und Ziele" cat="peeking" />
      <input
        autoFocus
        type="search"
        value={q}
        onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
        placeholder="Suchen … (überall: Strg/⌘ + K)"
        aria-label="Suchbegriff"
        className="w-full rounded-2xl bg-white px-4 py-3 text-lg shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:ring-slate-800"
      />

      {loaded && q.trim() && total === 0 && (
        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <SittingCat className="mx-auto mb-2 w-14 text-slate-300 dark:text-slate-600" />
          Nichts gefunden für „{q}“ – nur ich sitze hier.
        </div>
      )}

      {r.tasks.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-semibold">✅ Aufgaben ({r.tasks.length})</h2>
          <TaskList tasks={r.tasks} empty="" />
        </section>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {r.items.length > 0 && (
          <Group title={`🛒 Einkauf (${r.items.length})`}>
            {r.items.map((i) => (
              <Row key={i.id} to={`/gemeinsam/${encodeURIComponent(i.spaceId)}?tab=einkauf`} sub={r.spaceName.get(i.spaceId)}>
                <span className={i.done ? 'line-through opacity-60' : ''}>
                  {i.qty && <strong className="mr-1">{i.qty}</strong>}
                  {i.name}
                </span>
              </Row>
            ))}
          </Group>
        )}
        {r.recipes.length > 0 && (
          <Group title={`📖 Rezepte (${r.recipes.length})`}>
            {r.recipes.map((x) => (
              <Row key={x.id} to={`/gemeinsam/${encodeURIComponent(x.spaceId)}?tab=einkauf`} sub={r.spaceName.get(x.spaceId)}>
                {x.title}
              </Row>
            ))}
          </Group>
        )}
        {r.meals.length > 0 && (
          <Group title={`🍽️ Essensplan (${r.meals.length})`}>
            {r.meals.map((x) => (
              <Row key={x.id} to={`/gemeinsam/${encodeURIComponent(x.spaceId)}?tab=essen`} sub={formatDayShort(x.date)}>
                {x.title}
              </Row>
            ))}
          </Group>
        )}
        {r.habits.length > 0 && (
          <Group title={`🔁 Gewohnheiten (${r.habits.length})`}>
            {r.habits.map((h) => (
              <Row key={h.id} to="/gewohnheiten">
                {h.emoji} {h.name}
              </Row>
            ))}
          </Group>
        )}
        {r.goals.length > 0 && (
          <Group title={`🎯 Ziele (${r.goals.length})`}>
            {r.goals.map((g) => (
              <Row key={g.id} to="/ziele" sub={g.achievedAt ? 'erreicht ✓' : g.month}>
                {g.title}
              </Row>
            ))}
          </Group>
        )}
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={card}>
      <h2 className="mb-2 font-semibold">{title}</h2>
      <ul className="grid gap-0.5">{children}</ul>
    </section>
  )
}

function Row({ to, sub, children }: { to: string; sub?: string; children: ReactNode }) {
  return (
    <li>
      <Link to={to} className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
        <span className="min-w-0 truncate">{children}</span>
        {sub && <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{sub}</span>}
      </Link>
    </li>
  )
}

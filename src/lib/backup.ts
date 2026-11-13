import {
  db,
  type DayLog,
  type FocusItem,
  type Goal,
  type Habit,
  type FocusSession,
  type HabitCheck,
  type Meal,
  type Recipe,
  type ShoppingItem,
  type ShoppingList,
  type Space,
  type Task,
  type TimeBlock,
  type WeekReview,
} from '../db'
import { importLegacyData, type LegacyData } from './legacy'
import { createSpace } from './spaces'

const FORMAT = 'powerplan-backup'
/**
 * 1 = Aufgaben, Zeitblöcke, Tagesbilanzen · 2 = + Gewohnheiten · 3 = + Ziele und Wochenfokus
 * 4 = Cloud-Version: IDs sind Texte · 5 = + gemeinsame Bereiche, Einkaufslisten, Artikel und Rezepte · 6 = + Essensplan · 7 = + Fokus-Sitzungen, Wochenrückblicke
 */
const VERSION = 7

interface Backup {
  format: typeof FORMAT
  version: number
  exportedAt: string
  tasks: Task[]
  timeBlocks: TimeBlock[]
  dayLogs: DayLog[]
  habits: Habit[]
  habitChecks: HabitCheck[]
  goals: Goal[]
  weekFocus: FocusItem[]
  // ab Version 5: gemeinsame Bereiche
  spaces: Space[]
  shoppingLists: ShoppingList[]
  shoppingItems: ShoppingItem[]
  recipes: Recipe[]
  meals: Meal[]
  focusSessions: FocusSession[]
  weekReviews: WeekReview[]
}

/** Alle Daten als JSON-Datei herunterladen. */
export async function exportBackup() {
  const data: Backup = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    tasks: await db.tasks.toArray(),
    timeBlocks: await db.timeBlocks.toArray(),
    dayLogs: await db.dayLogs.toArray(),
    habits: await db.habits.toArray(),
    habitChecks: await db.habitChecks.toArray(),
    goals: await db.goals.toArray(),
    weekFocus: await db.weekFocus.toArray(),
    spaces: await db.spaces.toArray(),
    shoppingLists: await db.shoppingLists.toArray(),
    shoppingItems: await db.shoppingItems.toArray(),
    recipes: await db.recipes.toArray(),
    meals: await db.meals.toArray(),
    focusSessions: await db.focusSessions.toArray(),
    weekReviews: await db.weekReviews.toArray(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `powerplan-backup-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Liest und prüft eine Backup-Datei (Version 1–7). Wirft einen Fehler mit deutscher Meldung, wenn ungültig. */
export async function readBackup(file: File): Promise<Backup> {
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  const b = data as Partial<Backup>
  if (b?.format !== FORMAT || !Array.isArray(b.tasks)) {
    throw new Error('Das ist keine PowerPlan-Sicherung.')
  }
  if ((b.version ?? 0) > VERSION) {
    throw new Error('Die Sicherung stammt aus einer neueren PowerPlan-Version.')
  }
  const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])
  return {
    format: FORMAT,
    version: b.version ?? 1,
    exportedAt: b.exportedAt ?? '',
    tasks: b.tasks,
    timeBlocks: list(b.timeBlocks),
    dayLogs: list(b.dayLogs),
    habits: list(b.habits),
    habitChecks: list(b.habitChecks),
    goals: list(b.goals),
    weekFocus: list(b.weekFocus),
    spaces: list(b.spaces),
    shoppingLists: list(b.shoppingLists),
    shoppingItems: list(b.shoppingItems),
    recipes: list(b.recipes),
    meals: list(b.meals),
    focusSessions: list(b.focusSessions),
    weekReviews: list(b.weekReviews),
  }
}

export interface RestoreResult {
  /** Bereiche, die es nicht mehr gab und die neu angelegt wurden (Mitglieder müssen neu eingeladen werden) */
  recreatedSpaces: string[]
  /** Gemeinsame Aufgaben ohne Bereich in der Sicherung → als private Aufgaben übernommen */
  madePrivate: number
}

/** Objekt ohne ID (damit die Cloud beim Anlegen eine neue vergibt). */
function withoutId<T extends { id: string }>(o: T): Omit<T, 'id'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = o
  return rest
}

/**
 * Übernimmt eine Sicherung in die (Cloud-)Datenbank. Es wird nichts gelöscht:
 * - Version 4–7: Einträge werden mit ihren IDs zurückgeschrieben (gleiche ID = aktualisieren)
 * - Version 1–3 (vor der Cloud): Einträge bekommen neue IDs, Verknüpfungen werden umgeschrieben
 *
 * Gemeinsame Bereiche (ab Version 5):
 * - Bereich gibt es noch → Inhalte werden zurückgeschrieben (für alle Mitglieder sichtbar)
 * - Bereich wurde gelöscht → er wird mit neuem Realm neu angelegt; Listen, Artikel, Rezepte und
 *   Aufgaben bekommen neue IDs und zeigen auf den neuen Bereich. Mitglieder lädt man neu ein.
 * - Gemeinsame Aufgabe, deren Bereich nicht in der Sicherung ist → wird als private Aufgabe übernommen
 *   (sonst lehnt die Cloud sie ab, weil der alte Bereich nicht mehr existiert).
 */
export async function restoreBackup(b: Backup): Promise<RestoreResult> {
  const result: RestoreResult = { recreatedSpaces: [], madePrivate: 0 }
  if (b.version < 4) {
    await importLegacyData(b as unknown as LegacyData)
    return result
  }

  // 1) Bereiche zuordnen: vorhandene behalten, gelöschte neu anlegen (eigene Transaktion je Bereich)
  const spaceMap = new Map<string, { id: string; realmId: string; recreated: boolean }>()
  for (const s of b.spaces) {
    const existing = await db.spaces.get(s.id)
    if (existing) {
      spaceMap.set(s.id, { id: existing.id, realmId: existing.realmId, recreated: false })
    } else {
      const id = await createSpace(s.title, s.emoji, { withList: false })
      const created = await db.spaces.get(id)
      spaceMap.set(s.id, { id, realmId: created!.realmId, recreated: true })
      result.recreatedSpaces.push(s.title)
    }
  }

  const tables = [db.tasks, db.timeBlocks, db.dayLogs, db.habits, db.habitChecks, db.goals, db.weekFocus, db.shoppingLists, db.shoppingItems, db.recipes, db.meals, db.focusSessions, db.weekReviews]
  await db.transaction('rw', tables, async () => {
    // 2) Aufgaben – bei neu angelegten Bereichen mit neuer ID (Zeitblöcke werden umgehängt)
    const taskIdMap = new Map<string, string>()
    for (const t of b.tasks) {
      if (!t.spaceId) {
        await db.tasks.put(t)
        continue
      }
      const target = spaceMap.get(t.spaceId)
      if (!target) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { spaceId, realmId, assignee, ...rest } = t
        await db.tasks.put(rest as Task)
        result.madePrivate++
      } else if (!target.recreated) {
        await db.tasks.put({ ...t, realmId: target.realmId })
      } else {
        const newId = await db.tasks.add({ ...withoutId(t), spaceId: target.id, realmId: target.realmId, repeatFromId: undefined } as Task)
        taskIdMap.set(t.id, newId)
      }
    }
    await db.timeBlocks.bulkPut(b.timeBlocks.map((bl) => (bl.taskId && taskIdMap.has(bl.taskId) ? { ...bl, taskId: taskIdMap.get(bl.taskId) } : bl)))

    // 3) Private Daten wie bisher
    await db.dayLogs.bulkPut(b.dayLogs)
    await db.habits.bulkPut(b.habits)
    await db.habitChecks.bulkPut(b.habitChecks)
    await db.goals.bulkPut(b.goals)
    await db.weekFocus.bulkPut(b.weekFocus)
    await db.focusSessions.bulkPut(b.focusSessions)
    await db.weekReviews.bulkPut(b.weekReviews)

    // 4) Einkaufslisten, Artikel, Rezepte
    const listIdMap = new Map<string, string>()
    for (const l of b.shoppingLists) {
      const target = spaceMap.get(l.spaceId)
      if (!target) continue
      if (!target.recreated) await db.shoppingLists.put({ ...l, realmId: target.realmId })
      else listIdMap.set(l.id, await db.shoppingLists.add({ ...withoutId(l), spaceId: target.id, realmId: target.realmId } as ShoppingList))
    }
    for (const i of b.shoppingItems) {
      const target = spaceMap.get(i.spaceId)
      if (!target) continue
      if (!target.recreated) await db.shoppingItems.put({ ...i, realmId: target.realmId })
      else {
        const listId = listIdMap.get(i.listId)
        if (listId) await db.shoppingItems.add({ ...withoutId(i), listId, spaceId: target.id, realmId: target.realmId } as ShoppingItem)
      }
    }
    const recipeIdMap = new Map<string, string>()
    for (const r of b.recipes) {
      const target = spaceMap.get(r.spaceId)
      if (!target) continue
      if (!target.recreated) await db.recipes.put({ ...r, realmId: target.realmId })
      else recipeIdMap.set(r.id, await db.recipes.add({ ...withoutId(r), spaceId: target.id, realmId: target.realmId } as Recipe))
    }

    // 5) Essensplan – Verweis aufs Rezept bei neu angelegten Bereichen umhängen
    for (const m of b.meals) {
      const target = spaceMap.get(m.spaceId)
      if (!target) continue
      if (!target.recreated) await db.meals.put({ ...m, realmId: target.realmId })
      else {
        const recipeId = m.recipeId ? recipeIdMap.get(m.recipeId) : undefined
        await db.meals.add({ ...withoutId(m), spaceId: target.id, realmId: target.realmId, recipeId } as Meal)
      }
    }
  })
  return result
}

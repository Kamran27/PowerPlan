import { db, type Task, type TimeBlock } from '../db'
import { todayISO } from './date'
import { DAY_START, DEFAULT_DURATION, fromMinutes, MAX_END, nowMinutes, SNAP, toMinutes } from './time'
import { updateTask } from './tasks'

/** MIME-Typ für Drag & Drop einer Aufgabe auf die Zeitleiste. */
export const TASK_DRAG_TYPE = 'application/x-powerplan-task'

export async function addBlock(block: Omit<TimeBlock, 'id'>): Promise<number> {
  return db.timeBlocks.add(block as TimeBlock)
}

export async function updateBlock(id: number, changes: Partial<Omit<TimeBlock, 'id'>>) {
  await db.timeBlocks.update(id, changes)
}

export async function deleteBlock(id: number) {
  await db.timeBlocks.delete(id)
}

export async function restoreBlock(block: TimeBlock) {
  await db.timeBlocks.put(block)
}

/** Frühester freier Start ab `from` für `duration` Minuten, oder null wenn heute kein Platz mehr ist. */
export function findFreeSlot(blocks: TimeBlock[], from: number, duration: number): number | null {
  let t = from
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start))
  for (const b of sorted) {
    const s = toMinutes(b.start)
    const e = toMinutes(b.end)
    if (e <= t) continue
    if (s - t >= duration) break
    t = Math.max(t, e)
  }
  return t + duration <= MAX_END ? t : null
}

/**
 * Plant eine Aufgabe in die nächste freie Stunde von heute ein.
 * Ist sie nicht für heute fällig, wird das Fälligkeitsdatum auf heute gesetzt.
 * Gibt die Infos für „Rückgängig“ zurück, oder null wenn kein Platz frei ist.
 */
export async function scheduleTaskToday(task: Task) {
  const today = todayISO()
  const blocks = await db.timeBlocks.where('date').equals(today).toArray()
  const from = Math.max(DAY_START, Math.ceil(nowMinutes() / SNAP) * SNAP)
  const start = findFreeSlot(blocks, from, DEFAULT_DURATION)
  if (start === null) return null

  const blockId = await addBlock({
    date: today,
    start: fromMinutes(start),
    end: fromMinutes(start + DEFAULT_DURATION),
    title: task.title,
    taskId: task.id,
  })
  const prevDue = task.dueDate
  const dueChanged = !prevDue || prevDue > today
  if (dueChanged) await updateTask(task.id, { dueDate: today })

  return {
    start: fromMinutes(start),
    undo: async () => {
      await deleteBlock(blockId)
      if (dueChanged) await updateTask(task.id, { dueDate: prevDue })
    },
  }
}

export interface PlacedBlock {
  block: TimeBlock
  lane: number // Spalte innerhalb überlappender Blöcke
  lanes: number // Anzahl Spalten in dieser Gruppe
}

/** Verteilt überlappende Blöcke nebeneinander auf Spalten. */
export function layoutBlocks(blocks: TimeBlock[]): PlacedBlock[] {
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end))
  const result: PlacedBlock[] = []
  let group: PlacedBlock[] = []
  let laneEnds: number[] = []
  let groupEnd = -1

  const flush = () => {
    for (const p of group) p.lanes = laneEnds.length
    result.push(...group)
    group = []
    laneEnds = []
  }

  for (const block of sorted) {
    const s = toMinutes(block.start)
    const e = toMinutes(block.end)
    if (s >= groupEnd) {
      flush()
      groupEnd = e
    } else {
      groupEnd = Math.max(groupEnd, e)
    }
    let lane = laneEnds.findIndex((end) => end <= s)
    if (lane === -1) lane = laneEnds.push(e) - 1
    else laneEnds[lane] = e
    group.push({ block, lane, lanes: 1 })
  }
  flush()
  return result
}

import type { Task } from '../db'
import { formatDayShort } from '../lib/date'
import { taskPoints } from '../lib/points'
import { toggleTask } from '../lib/tasks'
import { useToast } from './Toast'

/** Abhaken/Wieder-öffnen mit Punkte-Meldung („+30 Punkte“) – bei Wiederholungen mit dem nächsten Termin. */
export function useToggleTask() {
  const toast = useToast()
  return async (task: Task) => {
    const { nextDue } = await toggleTask(task)
    if (task.done) return
    toast(nextDue ? `+${taskPoints(task)} Punkte 🎉 · 🔁 nächstes Mal ${formatDayShort(nextDue)}` : `+${taskPoints(task)} Punkte 🎉`)
  }
}

import { db, type Task } from '../db'
import { formatDayShort } from '../lib/date'
import { taskPoints } from '../lib/points'
import { shortName } from '../lib/spaces'
import { toggleTask } from '../lib/tasks'
import { useToast } from './Toast'

/**
 * Abhaken/Wieder-öffnen mit Punkte-Meldung („+30 Punkte“) – bei Wiederholungen mit dem nächsten Termin,
 * bei Haushalts-Rotation mit der Person, die als Nächstes dran ist.
 */
export function useToggleTask() {
  const toast = useToast()
  return async (task: Task) => {
    const { nextDue, nextAssignee } = await toggleTask(task)
    if (task.done) return
    const me = db.cloud.currentUser.value?.email
    const who = nextAssignee ? ` · ${nextAssignee === me ? 'dann bist du dran' : `dann ist ${shortName(nextAssignee)} dran`}` : ''
    toast(nextDue ? `+${taskPoints(task)} Punkte 🎉 · 🔁 nächstes Mal ${formatDayShort(nextDue)}${who}` : `+${taskPoints(task)} Punkte 🎉`)
  }
}

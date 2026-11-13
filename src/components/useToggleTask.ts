import { db, type Task } from '../db'
import { formatDayShort } from '../lib/date'
import { taskPoints } from '../lib/points'
import { shortName } from '../lib/spaces'
import { toggleTask } from '../lib/tasks'
import { haptic } from '../lib/useIsMobile'
import { withViewTransition } from '../lib/viewTransition'
import { useToast } from './Toast'

/**
 * Abhaken/Wieder-öffnen mit Punkte-Meldung („+30 Punkte“) – bei Wiederholungen mit dem nächsten Termin,
 * bei Haushalts-Rotation mit der Person, die als Nächstes dran ist. Mit weichem Umsortieren und kurzem Vibrieren.
 */
export function useToggleTask() {
  const toast = useToast()
  return async (task: Task) => {
    if (!task.done) haptic(15)
    const { nextDue, nextAssignee } = (await withViewTransition(() => toggleTask(task))) ?? {}
    if (task.done) return
    const me = db.cloud.currentUser.value?.email
    const who = nextAssignee ? ` · ${nextAssignee === me ? 'dann bist du dran' : `dann ist ${shortName(nextAssignee)} dran`}` : ''
    toast(nextDue ? `+${taskPoints(task)} Punkte 🎉 · 🔁 nächstes Mal ${formatDayShort(nextDue)}${who}` : `+${taskPoints(task)} Punkte 🎉`)
  }
}

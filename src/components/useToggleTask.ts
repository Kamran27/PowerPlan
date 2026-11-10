import type { Task } from '../db'
import { taskPoints } from '../lib/points'
import { toggleTask } from '../lib/tasks'
import { useToast } from './Toast'

/** Abhaken/Wieder-öffnen mit Punkte-Meldung („+30 Punkte“) beim Erledigen. */
export function useToggleTask() {
  const toast = useToast()
  return async (task: Task) => {
    await toggleTask(task)
    if (!task.done) toast(`+${taskPoints(task)} Punkte 🎉`)
  }
}

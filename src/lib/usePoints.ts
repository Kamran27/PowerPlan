import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../db'
import { pointsByDay } from './points'

/** Punkte pro Tag aus allen Quellen (Aufgaben, Gewohnheiten, Wochenfokus, Ziele), live aktualisiert. */
export function usePointsByDay() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const habitChecks = useLiveQuery(() => db.habitChecks.toArray(), [])
  const focus = useLiveQuery(() => db.weekFocus.toArray(), [])
  const goals = useLiveQuery(() => db.goals.toArray(), [])
  return useMemo(
    () => pointsByDay({ tasks: tasks ?? [], habitChecks: habitChecks ?? [], focus: focus ?? [], goals: goals ?? [] }),
    [tasks, habitChecks, focus, goals],
  )
}

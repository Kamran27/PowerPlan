import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../db'
import { checksByHabit } from './habits'

/** Alle Gewohnheiten (nach Anlegedatum) und ihre Haken, live aktualisiert. */
export function useHabits() {
  const habits = useLiveQuery(() => db.habits.orderBy('createdAt').toArray(), [])
  const checks = useLiveQuery(() => db.habitChecks.toArray(), [])
  const doneByHabit = useMemo(() => checksByHabit(checks ?? []), [checks])
  return { habits, checks, doneByHabit, loaded: habits !== undefined && checks !== undefined }
}

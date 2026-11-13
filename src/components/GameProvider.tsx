import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, type ReactNode } from 'react'
import { db } from '../db'
import { todayISO } from '../lib/date'
import { computeBadges, levelInfo, type GameData } from '../lib/game'
import { GameContext, type GameState } from '../lib/gameContext'
import { pointsByDay } from '../lib/points'
import { readStore, writeStore } from '../lib/storage'
import { visibleForMe } from '../lib/spaces'
import { useMyEmail } from '../lib/useMe'
import { useToast } from './Toast'

const SEEN_KEY = 'powerplan.seen' // { level: number, badges: string[] }

/** Lädt alle Daten einmal, berechnet Punkte/Level/Abzeichen und meldet Aufstiege & neue Abzeichen. */
export default function GameProvider({ children }: { children: ReactNode }) {
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const habits = useLiveQuery(() => db.habits.toArray(), [])
  const habitChecks = useLiveQuery(() => db.habitChecks.toArray(), [])
  const focus = useLiveQuery(() => db.weekFocus.toArray(), [])
  const goals = useLiveQuery(() => db.goals.toArray(), [])
  const dayLogs = useLiveQuery(() => db.dayLogs.toArray(), [])
  const timeBlocks = useLiveQuery(() => db.timeBlocks.toArray(), [])
  const sessions = useLiveQuery(() => db.focusSessions.toArray(), [])
  const reviews = useLiveQuery(() => db.weekReviews.toArray(), [])
  const toast = useToast()
  const me = useMyEmail()

  const loaded = [tasks, habits, habitChecks, focus, goals, dayLogs, timeBlocks, sessions, reviews].every((x) => x !== undefined)

  const state = useMemo<GameState>(() => {
    const data: GameData = {
      // Nur, was mich betrifft: private Aufgaben + gemeinsame, die mir oder allen zugewiesen sind
      tasks: (tasks ?? []).filter((t) => visibleForMe(t, me)),
      habits: habits ?? [],
      habitChecks: habitChecks ?? [],
      focus: focus ?? [],
      goals: goals ?? [],
      dayLogs: dayLogs ?? [],
      timeBlocks: timeBlocks ?? [],
      sessions: sessions ?? [],
      reviews: reviews ?? [],
    }
    const byDay = pointsByDay({ tasks: tasks ?? [], me, habitChecks: data.habitChecks, focus: data.focus, goals: data.goals, sessions: data.sessions, reviews: data.reviews })
    let total = 0
    for (const p of byDay.values()) total += p
    return { loaded, me, data, byDay, total, level: levelInfo(total), badges: computeBadges(data, total, todayISO()) }
  }, [loaded, me, tasks, habits, habitChecks, focus, goals, dayLogs, timeBlocks, sessions, reviews])

  // Neue Level und Abzeichen melden (gemerkt pro Browser, damit nichts doppelt kommt).
  useEffect(() => {
    if (!state.loaded) return
    const seen = readStore<{ level: number; badges: string[] } | null>(SEEN_KEY, null)
    const unlocked = state.badges.filter((b) => b.unlocked).map((b) => b.id)

    if (seen === null) {
      // Allererster Start: Stand übernehmen, nur eine kurze Zusammenfassung zeigen.
      if (unlocked.length) toast(`🏅 ${unlocked.length} Abzeichen schon freigeschaltet – schau in die Statistik!`)
    } else {
      const fresh = state.badges.filter((b) => b.unlocked && !seen.badges.includes(b.id))
      if (state.level.level > seen.level) {
        toast(`🎉 Level ${state.level.level} erreicht – ${state.level.title}!`)
      } else if (fresh.length === 1) {
        toast(`🏅 Neues Abzeichen: ${fresh[0].emoji} ${fresh[0].title}`)
      } else if (fresh.length > 1) {
        toast(`🏅 ${fresh.length} neue Abzeichen freigeschaltet!`)
      }
    }
    // Abzeichen, die durch Rückgängig wieder gesperrt sind, bleiben „gesehen“ – keine Doppelmeldung.
    const badges = Array.from(new Set([...(seen?.badges ?? []), ...unlocked]))
    writeStore(SEEN_KEY, { level: Math.max(seen?.level ?? 1, state.level.level), badges })
  }, [state, toast])

  return <GameContext.Provider value={state}>{children}</GameContext.Provider>
}

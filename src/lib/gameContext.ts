import { createContext, useContext } from 'react'
import type { Badge, GameData, LevelInfo } from './game'

export interface GameState {
  loaded: boolean
  data: GameData
  /** Datum → Punkte */
  byDay: Map<string, number>
  total: number
  level: LevelInfo
  badges: Badge[]
}

export const GameContext = createContext<GameState | null>(null)

/** Punkte, Level und Abzeichen – überall in der App verfügbar (bereitgestellt von GameProvider). */
export function useGame(): GameState {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame muss innerhalb von <GameProvider> verwendet werden')
  return ctx
}

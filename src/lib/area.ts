import { useState } from 'react'
import type { Task } from '../db'

/*
 * Aufgaben trennen: Privat und Arbeit. Gemeinsame Aufgaben (Bereiche) sind immer privat.
 * Filter und zuletzt gewählter Bereich werden pro Gerät gemerkt.
 */

export type Area = 'privat' | 'arbeit'
export type AreaFilter = 'alle' | Area

export const AREAS: { value: Area; label: string; emoji: string }[] = [
  { value: 'privat', label: 'Privat', emoji: '🏠' },
  { value: 'arbeit', label: 'Arbeit', emoji: '💼' },
]

export function areaOf(t: Pick<Task, 'area' | 'spaceId'>): Area {
  return !t.spaceId && t.area === 'arbeit' ? 'arbeit' : 'privat'
}

export function matchesArea(t: Pick<Task, 'area' | 'spaceId'>, f: AreaFilter): boolean {
  return f === 'alle' || areaOf(t) === f
}

function read<T extends string>(key: string, fallback: T, allowed: readonly string[]): T {
  try {
    const v = localStorage.getItem(key)
    return v && allowed.includes(v) ? (v as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, v: string) {
  try {
    localStorage.setItem(key, v)
  } catch {
    /* egal */
  }
}

/** Gemerkter Filter (Alle/Privat/Arbeit) pro Seite */
export function useAreaFilter(page: string): [AreaFilter, (f: AreaFilter) => void] {
  const key = `powerplan-area-filter-${page}`
  const [f, setF] = useState<AreaFilter>(() => read(key, 'alle', ['alle', 'privat', 'arbeit']))
  return [
    f,
    (v) => {
      setF(v)
      write(key, v)
    },
  ]
}

/** Zuletzt gewählter Bereich für neue Aufgaben */
export function lastArea(): Area {
  return read('powerplan-area-last', 'privat', ['privat', 'arbeit'])
}

export function rememberArea(a: Area) {
  write('powerplan-area-last', a)
}

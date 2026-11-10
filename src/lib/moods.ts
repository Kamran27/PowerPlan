import type { DayLog } from '../db'

/** Stimmungen der Tagesbilanz (1 = schlecht … 5 = sehr gut). */
export const MOODS: { value: NonNullable<DayLog['mood']>; emoji: string; label: string }[] = [
  { value: 1, emoji: '😞', label: 'Schlecht' },
  { value: 2, emoji: '😕', label: 'Mäßig' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Gut' },
  { value: 5, emoji: '😄', label: 'Sehr gut' },
]

export function moodInfo(mood?: DayLog['mood']) {
  return MOODS.find((m) => m.value === mood)
}

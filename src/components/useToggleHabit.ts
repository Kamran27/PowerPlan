import { plusPoints } from '../lib/modules'
import { HABIT_POINTS, toggleHabit } from '../lib/habits'
import { haptic } from '../lib/useIsMobile'
import { useToast } from './Toast'

/** Gewohnheit abhaken/zurücknehmen, mit „+10 Punkte“-Meldung beim Erledigen. */
export function useToggleHabit() {
  const toast = useToast()
  return async (habitId: string, date: string) => {
    const done = await toggleHabit(habitId, date)
    if (done) {
      haptic(15)
      toast(`Erledigt 🎉${plusPoints(HABIT_POINTS)}`)
    }
  }
}

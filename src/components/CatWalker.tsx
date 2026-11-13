import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { WalkingCat } from './Cats'

/*
 * Regelmäßig spaziert eine kleine Katze unten über den Bildschirm (über der Handy-Leiste):
 * zuerst nach 8–15 Sekunden, danach alle 2–4 Minuten, und manchmal beim Seitenwechsel. Geheimtipp: 5× schnell auf „PowerPlan“
 * (Logo, am Computer) tippen → sofort eine kleine Katzenparade.
 */
export default function CatWalker() {
  const [walkers, setWalkers] = useState<{ id: number; delay: number }[]>([])

  useEffect(() => {
    let timer: number
    const walk = (count = 1) => {
      const now = Date.now()
      setWalkers(Array.from({ length: count }, (_, i) => ({ id: now + i, delay: i * 1.4 })))
      window.setTimeout(() => setWalkers([]), 16_000 + count * 1500)
    }
    const schedule = (first: boolean) => {
      const ms = first ? 8_000 + Math.random() * 7_000 : 2 * 60_000 + Math.random() * 2 * 60_000
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') walk()
        schedule(false)
      }, ms)
    }
    schedule(true)
    const onParade = (e: Event) => walk((e as CustomEvent<number>).detail ?? 3)
    window.addEventListener('powerplan-cats', onParade)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('powerplan-cats', onParade)
    }
  }, [])

  // Beim Seitenwechsel läuft manchmal (ca. jedes 4. Mal) eine Katze los
  const { pathname } = useLocation()
  const firstPath = useRef(true)
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false
      return
    }
    if (Math.random() < 0.25) {
      const id = Date.now()
      setWalkers((w) => (w.length ? w : [{ id, delay: 0.6 }]))
      window.setTimeout(() => setWalkers((w) => w.filter((x) => x.id !== id)), 16_000)
    }
  }, [pathname])

  return (
    <>
      {walkers.map((w) => (
        <div
          key={w.id}
          className="cat-walker bottom-[4.6rem] text-slate-400 md:bottom-1 dark:text-slate-500"
          style={{ animationDelay: `${w.delay}s` }}
        >
          <WalkingCat className="w-11" />
        </div>
      ))}
    </>
  )
}

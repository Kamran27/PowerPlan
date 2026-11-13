import { useEffect, useState } from 'react'
import { WalkingCat } from './Cats'

/*
 * Ab und zu spaziert eine kleine Katze unten über den Bildschirm (über der Handy-Leiste).
 * Zuerst nach 1–2 Minuten, danach alle 8–15 Minuten. Geheimtipp: 5× schnell auf „PowerPlan“
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
      const ms = first ? 60_000 + Math.random() * 60_000 : 8 * 60_000 + Math.random() * 7 * 60_000
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

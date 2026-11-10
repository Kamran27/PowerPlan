import { useEffect, useState } from 'react'
import { nowMinutes } from './time'

/** Aktuelle Uhrzeit in Minuten; aktualisiert sich alle 30 Sekunden. */
export function useNowMinutes(): number {
  const [now, setNow] = useState(nowMinutes)
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMinutes()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

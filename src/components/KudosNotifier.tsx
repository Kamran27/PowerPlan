import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '../db'
import { pawConfetti } from '../lib/celebrate'
import { shortName } from '../lib/spaces'
import { readStore, writeStore } from '../lib/storage'
import { useMyEmail } from '../lib/useMe'
import { useToast } from './Toast'

const KEY = 'powerplan.kudos-seen' // Aufgaben-ID → schon gemeldete Applaus-Personen

/** Meldet neuen 👏-Applaus für meine erledigten Aufgaben (einmal pro Gerät). */
export default function KudosNotifier() {
  const me = useMyEmail()
  const mine = useLiveQuery(() => (me ? db.tasks.filter((t) => t.doneBy === me && !!t.kudos?.length).toArray() : []), [me])
  const toast = useToast()

  useEffect(() => {
    if (!mine?.length) return
    const seen = readStore<Record<string, string[]>>(KEY, {})
    const fresh: { title: string; from: string }[] = []
    for (const t of mine) {
      for (const from of t.kudos ?? []) {
        if (!(seen[t.id] ?? []).includes(from)) fresh.push({ title: t.title, from })
      }
      seen[t.id] = t.kudos ?? []
    }
    writeStore(KEY, seen)
    if (!fresh.length) return
    const f = fresh[0]
    toast(fresh.length === 1 ? `👏 ${shortName(f.from)} feiert: „${f.title}“ – gut gemacht!` : `👏 ${fresh.length}× Applaus für deine erledigten Aufgaben!`)
    pawConfetti(14)
  }, [mine, toast])

  return null
}

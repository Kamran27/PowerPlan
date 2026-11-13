import { db, type Task } from '../db'

/*
 * 👏 „Gut gemacht“: Bei gemeinsamen Aufgaben, die jemand anderes erledigt hat, kann man applaudieren.
 * Die Person sieht es beim nächsten Öffnen der App (KudosNotifier).
 */

/** Darf ich hier applaudieren? Nur bei erledigten gemeinsamen Aufgaben anderer. */
export function canGiveKudos(t: Task, me?: string): boolean {
  return !!me && !!t.spaceId && t.done && !!t.doneBy && t.doneBy !== me
}

/** 👏 geben oder zurücknehmen. Gibt zurück, ob jetzt applaudiert ist. */
export async function toggleKudos(t: Task, me: string): Promise<boolean> {
  const fresh = await db.tasks.get(t.id)
  const list = fresh?.kudos ?? []
  const has = list.includes(me)
  await db.tasks.update(t.id, { kudos: has ? list.filter((e) => e !== me) : [...list, me] })
  return !has
}

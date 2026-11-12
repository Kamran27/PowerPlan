import { getTiedRealmId } from 'dexie-cloud-addon'
import { db, type ShoppingItem, type ShoppingList, type Space, type Task } from '../db'

/*
 * Gemeinsame Bereiche („Haushalt“, „Urlaub 2027“ …) mit Dexie Cloud:
 * Jeder Bereich hat einen eigenen Realm. Alles mit diesem realmId (Aufgaben, Listen, Artikel)
 * sehen alle Mitglieder des Realms. Mitglieder werden per E-Mail eingeladen.
 */

/** Aktuell angemeldete E-Mail (oder undefined). */
export function myEmail(): string | undefined {
  return db.cloud.currentUser.value?.email
}

/** Kurzer Anzeigename aus einer E-Mail: „anna.muster@…“ → „anna.muster“. */
export function shortName(email?: string): string {
  return email ? email.split('@')[0] : ''
}

/* ---------- Sichtbarkeit & Punkte bei gemeinsamen Aufgaben ---------- */

/**
 * Erscheint eine Aufgabe in MEINEN Ansichten (Heute, Woche, Aufgaben, Streak)?
 * Private immer; gemeinsame, wenn niemandem oder mir zugewiesen.
 */
export function visibleForMe(t: Task, me?: string): boolean {
  return !t.spaceId || !t.assignee || t.assignee === me
}

/** Zählen die Punkte einer erledigten Aufgabe für mich? Private immer; gemeinsame nur, wenn ich sie erledigt habe. */
export function pointsForMe(t: Task, me?: string): boolean {
  return !t.spaceId || (!!t.doneBy && t.doneBy === me)
}

/* ---------- Bereiche ---------- */

/** Legt einen Bereich samt eigenem Realm und einer ersten Einkaufsliste an. */
export async function createSpace(title: string, emoji?: string): Promise<string> {
  return db.transaction('rw', [db.spaces, db.realms, db.shoppingLists], async () => {
    const id = await db.spaces.add({
      title: title.trim(),
      emoji: emoji?.trim() || undefined,
      createdByEmail: myEmail(),
      createdAt: new Date().toISOString(),
    } as Space)
    const realmId = getTiedRealmId(id)
    await db.realms.put({ realmId, name: title.trim(), represents: 'ein gemeinsamer Bereich in PowerPlan' })
    await db.spaces.update(id, { realmId }) // ab jetzt gehört der Bereich in seinen Realm
    await db.shoppingLists.add({ spaceId: id, realmId, title: 'Einkauf', createdAt: new Date().toISOString() } as ShoppingList)
    return id
  })
}

export async function renameSpace(space: Space, title: string, emoji?: string) {
  await db.transaction('rw', [db.spaces, db.realms], async () => {
    await db.spaces.update(space.id, { title: title.trim(), emoji: emoji?.trim() || undefined })
    await db.realms.update(space.realmId, { name: title.trim() })
  })
}

/**
 * Löscht einen Bereich mit allem darin – für alle Mitglieder.
 * Wichtig (getestet): Kommen das Löschen der Inhalte und das Löschen des Realms im selben Abgleich
 * beim Server an, verwirft er alles, und lokal Gelöschtes taucht wieder auf. Deshalb:
 * 1) Inhalte löschen, 2) auf den Abgleich warten, 3) erst dann den Realm löschen.
 * Mitgliedschaften NICHT selbst löschen (auch die eigene des Besitzers – das lehnt der Server ab);
 * sie verschwinden mit dem Realm. Offline bleibt der (dann leere) Realm einfach bestehen – das stört nicht.
 */
export async function deleteSpace(space: Space) {
  await db.transaction('rw', [db.spaces, db.tasks, db.shoppingLists, db.shoppingItems], async () => {
    await db.shoppingItems.where('spaceId').equals(space.id).delete()
    await db.shoppingLists.where('spaceId').equals(space.id).delete()
    await db.tasks.where('spaceId').equals(space.id).delete()
    await db.spaces.delete(space.id)
  })
  try {
    await db.cloud.sync({ wait: true, purpose: 'push' })
  } catch {
    return // offline: Realm bleibt leer bestehen
  }
  await db.realms.delete(space.realmId)
}

/* ---------- Mitglieder ---------- */

/** Lädt jemanden per E-Mail ein (volle Rechte im Bereich). Die Person bekommt eine Einladungs-Mail. */
export async function inviteMember(space: Space, email: string) {
  const e = email.trim().toLowerCase()
  const exists = await db.members.where('[email+realmId]').equals([e, space.realmId]).count()
  if (exists) throw new Error('Diese Person ist schon eingeladen.')
  await db.members.add({ realmId: space.realmId, email: e, invite: true, permissions: { manage: '*' } })
}

export async function removeMember(memberId: string) {
  await db.members.delete(memberId)
}

/** Alle E-Mails, denen man im Bereich Aufgaben zuweisen kann (Ersteller + Mitglieder). */
export function assignableEmails(space: Space, memberEmails: (string | undefined)[]): string[] {
  return Array.from(new Set([space.createdByEmail, ...memberEmails].filter((e): e is string => !!e)))
}

/* ---------- Einkaufslisten ---------- */

export async function addShoppingList(space: Space, title: string) {
  await db.shoppingLists.add({ spaceId: space.id, realmId: space.realmId, title: title.trim(), createdAt: new Date().toISOString() } as ShoppingList)
}

export async function deleteShoppingList(list: ShoppingList) {
  await db.transaction('rw', [db.shoppingLists, db.shoppingItems], async () => {
    await db.shoppingItems.where('listId').equals(list.id).delete()
    await db.shoppingLists.delete(list.id)
  })
}

export async function addShoppingItem(list: ShoppingList, name: string, qty?: string, category?: string) {
  await db.shoppingItems.add({
    listId: list.id,
    spaceId: list.spaceId,
    realmId: list.realmId,
    name: name.trim(),
    qty: qty?.trim() || undefined,
    category,
    done: false,
    createdAt: new Date().toISOString(),
  } as ShoppingItem)
}

export async function toggleShoppingItem(item: ShoppingItem) {
  // update() statt put(): bei gleichzeitigen Änderungen werden Felder zusammengeführt
  await db.shoppingItems.update(item.id, item.done ? { done: false, doneAt: undefined } : { done: true, doneAt: new Date().toISOString() })
}

export async function updateShoppingItem(id: string, changes: Partial<Pick<ShoppingItem, 'name' | 'qty' | 'category'>>) {
  await db.shoppingItems.update(id, changes)
}

export async function deleteShoppingItem(id: string) {
  await db.shoppingItems.delete(id)
}

/**
 * Räumt alle abgehakten Artikel einer Liste weg. Sie werden nur ausgeblendet (nicht gelöscht),
 * damit sie als Vorschlag („schon mal gekauft“) wieder auftauchen.
 */
export async function clearDoneItems(list: ShoppingList) {
  await db.shoppingItems.where('listId').equals(list.id).filter((i) => i.done && !i.cleared).modify({ cleared: true })
}

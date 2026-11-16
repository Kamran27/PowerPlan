import { getTiedRealmId } from 'dexie-cloud-addon'
import { db, type BudgetItem, type Expense, type ShoppingItem, type ShoppingList, type Space, type Task } from '../db'
import { kindInfo, type SpaceKind } from './spaceKinds'
import { todayISO } from './date'

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

/** Initialen aus einer E-Mail: „anna.muster@…“ → „AM“, „kamran@…“ → „KA“. */
export function initials(email?: string): string {
  const name = shortName(email)
  const parts = name.split(/[._\-+]+/).filter(Boolean)
  const raw = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return raw.toUpperCase() || '?'
}

/** Feste Farbe pro Person (aus der E-Mail berechnet) – auf allen Geräten gleich. */
export const PERSON_COLORS = [
  'bg-sky-100 text-sky-800 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-500/40',
  'bg-rose-100 text-rose-800 ring-rose-300 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-500/40',
  'bg-teal-100 text-teal-800 ring-teal-300 dark:bg-teal-500/20 dark:text-teal-200 dark:ring-teal-500/40',
  'bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-500/40',
  'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-300 dark:bg-fuchsia-500/20 dark:text-fuchsia-200 dark:ring-fuchsia-500/40',
  'bg-lime-100 text-lime-800 ring-lime-300 dark:bg-lime-500/20 dark:text-lime-200 dark:ring-lime-500/40',
]

export function personColorIndex(email?: string): number {
  let h = 0
  for (const ch of (email ?? '').toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % PERSON_COLORS.length
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

/**
 * Legt einen Bereich samt eigenem Realm an – mit Art (Vorlage). Startinhalte der Vorlage:
 * Listen immer, Aufgaben nur mit `starter` (Standard: ja). `withList: false` = ganz ohne Listen.
 */
export async function createSpace(
  title: string,
  emoji?: string,
  opts: { withList?: boolean; kind?: SpaceKind; starter?: boolean; date?: string } = {},
): Promise<string> {
  const id = await db.transaction('rw', [db.spaces, db.realms], async () => {
    const id = await db.spaces.add({
      title: title.trim(),
      emoji: emoji?.trim() || undefined,
      createdByEmail: myEmail(),
      createdAt: new Date().toISOString(),
      ...(opts.kind && opts.kind !== 'frei' ? { kind: opts.kind } : {}),
      ...(opts.date ? { date: opts.date } : {}),
    } as Space)
    const realmId = getTiedRealmId(id)
    await db.realms.put({ realmId, name: title.trim(), represents: 'ein gemeinsamer Bereich in PowerPlan' })
    await db.spaces.update(id, { realmId }) // ab jetzt gehört der Bereich in seinen Realm
    return id
  })
  if (opts.withList !== false) {
    const space = (await db.spaces.get(id))!
    await applyKind(space, opts.kind ?? 'frei', { tasks: opts.starter !== false, items: opts.starter !== false })
  }
  return id
}

/**
 * Startinhalte einer Vorlage in einen Bereich legen: fehlende Listen (nach Titel) anlegen,
 * optional mit Beispiel-Einträgen, und optional die Start-Aufgaben (ohne Doppelte).
 */
export async function applyKind(space: Space, kind: SpaceKind, opts: { tasks: boolean; items: boolean }) {
  const info = kindInfo(kind)
  const now = new Date().toISOString()
  await db.transaction('rw', [db.shoppingLists, db.shoppingItems, db.tasks], async () => {
    const existing = await db.shoppingLists.where('spaceId').equals(space.id).toArray()
    for (const l of info.lists) {
      if (existing.some((e) => e.title.toLowerCase() === l.title.toLowerCase())) continue
      const listId = await db.shoppingLists.add({
        spaceId: space.id,
        realmId: space.realmId,
        title: l.title,
        createdAt: now,
        ...(l.plain ? { plain: true } : {}),
      } as ShoppingList)
      if (opts.items) {
        for (const name of l.items) {
          await db.shoppingItems.add({ listId, spaceId: space.id, realmId: space.realmId, name, done: false, createdAt: now } as ShoppingItem)
        }
      }
    }
    if (opts.tasks) {
      const titles = new Set((await db.tasks.where('spaceId').equals(space.id).toArray()).map((t) => t.title.toLowerCase()))
      for (const t of info.tasks) {
        if (titles.has(t.title.toLowerCase())) continue
        await db.tasks.add({
          title: t.title,
          priority: 2,
          done: false,
          createdAt: now,
          spaceId: space.id,
          realmId: space.realmId,
          // Wiederkehrende brauchen einen ersten Termin
          ...(t.repeat ? { repeat: t.repeat, dueDate: todayISO() } : {}),
        } as Task)
      }
    }
  })
}

/** Art und Stichtag eines Bereichs ändern */
export async function updateSpaceKind(space: Space, kind: SpaceKind, date?: string) {
  await db.spaces.update(space.id, { kind: kind === 'frei' ? undefined : kind, date: date || undefined })
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
  await db.transaction('rw', [db.spaces, db.tasks, db.shoppingLists, db.shoppingItems, db.recipes, db.meals, db.expenses, db.budgetItems], async () => {
    await db.budgetItems.where('spaceId').equals(space.id).delete()
    await db.expenses.where('spaceId').equals(space.id).delete()
    await db.meals.where('spaceId').equals(space.id).delete()
    await db.recipes.where('spaceId').equals(space.id).delete()
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

/* ---------- Haushalts-Rotation ---------- */

/** Reihenfolge für „abwechselnd“: alle Personen, beginnend bei `start` (z. B. [ich, anna] ab anna → [anna, ich]). */
export function makeRotation(people: string[], start?: string): string[] {
  const i = start ? people.indexOf(start) : -1
  return i <= 0 ? [...people] : [...people.slice(i), ...people.slice(0, i)]
}

/** Wer ist als Nächstes dran? Unbekannt/leer → die erste Person. */
export function nextInRotation(rotation: string[], current?: string): string {
  const i = current ? rotation.indexOf(current) : -1
  return rotation[(i + 1) % rotation.length]
}

/* ---------- Einkaufslisten ---------- */

export async function addShoppingList(space: Space, title: string, opts: { plain?: boolean } = {}) {
  await db.shoppingLists.add({
    spaceId: space.id,
    realmId: space.realmId,
    title: title.trim(),
    createdAt: new Date().toISOString(),
    ...(opts.plain ? { plain: true } : {}),
  } as ShoppingList)
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

/* ---------- Kosten teilen ---------- */

export async function addExpense(space: Space, e: { title: string; amount: number; paidBy: string; to?: string; date?: string; forPerson?: string }) {
  await db.expenses.add({
    spaceId: space.id,
    realmId: space.realmId,
    title: e.title.trim(),
    amount: e.amount,
    paidBy: e.paidBy,
    ...(e.to ? { to: e.to } : {}),
    ...(e.forPerson ? { forPerson: e.forPerson } : {}),
    date: e.date || todayISO(),
    createdAt: new Date().toISOString(),
  } as Expense)
}

export async function updateExpense(id: string, changes: Partial<Pick<Expense, 'title' | 'amount' | 'paidBy' | 'to' | 'date' | 'forPerson'>>) {
  await db.expenses.update(id, changes)
}

export async function deleteExpense(id: string) {
  await db.expenses.delete(id)
}

/* ---------- Budget: Fixkosten und Sparziele ---------- */

export async function addBudgetItem(space: Space, item: Omit<BudgetItem, 'id' | 'spaceId' | 'realmId' | 'createdAt'>) {
  await db.budgetItems.add({ ...item, title: item.title.trim(), spaceId: space.id, realmId: space.realmId, createdAt: new Date().toISOString() } as BudgetItem)
}

export async function updateBudgetItem(id: string, changes: Partial<Omit<BudgetItem, 'id' | 'spaceId' | 'realmId'>>) {
  await db.budgetItems.update(id, changes)
}

export async function deleteBudgetItem(id: string) {
  await db.budgetItems.delete(id)
}

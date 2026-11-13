/*
 * Weiche Übergänge beim Umsortieren (View Transitions API – Chrome, Edge, Safari 18+):
 * Erledigtes gleitet sichtbar nach unten statt zu springen. Ohne Unterstützung oder mit
 * „Bewegung reduzieren“ passiert die Änderung einfach sofort.
 */
type DocWithVT = Document & { startViewTransition?: (cb: () => Promise<void>) => { updateCallbackDone: Promise<void> } }

export async function withViewTransition<T>(change: () => Promise<T>): Promise<T> {
  const doc = document as DocWithVT
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || reduce) return change()
  let result!: T
  try {
    const vt = doc.startViewTransition(async () => {
      result = await change()
      // Die Listen aktualisieren sich über die Datenbank einen Augenblick später
      await new Promise((r) => setTimeout(r, 70))
    })
    await vt.updateCallbackDone
  } catch {
    // Übergang nicht möglich (z. B. doppelte Namen) – Änderung ist trotzdem passiert
  }
  return result
}

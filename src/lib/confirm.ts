/*
 * Eigene Sicherheitsabfrage statt window.confirm():
 * Manche Browser (eingebettete Browser, manche App-Ansichten) zeigen window.confirm() gar nicht an
 * und antworten sofort mit „Nein“ – dann passierte z. B. beim Löschen einfach nichts.
 * Dieses Fenster gehört zur App und funktioniert überall (hell/dunkel, Tastatur: Enter/Escape).
 */

export function confirmDialog(
  message: string,
  opts: { title?: string; confirmLabel?: string; danger?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement as HTMLElement | null
    const root = document.createElement('div')
    root.className = 'fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center'
    root.setAttribute('role', 'alertdialog')
    root.setAttribute('aria-modal', 'true')

    const backdrop = document.createElement('div')
    backdrop.className = 'sheet-backdrop absolute inset-0 bg-black/40'

    const panel = document.createElement('div')
    panel.className = 'sheet-panel relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900'

    const h = document.createElement('h2')
    h.className = 'text-base font-semibold text-slate-900 dark:text-slate-100'
    h.textContent = opts.title ?? 'Bist du sicher?'
    const p = document.createElement('p')
    p.className = 'mt-2 text-sm text-slate-600 dark:text-slate-300'
    p.textContent = message
    root.setAttribute('aria-label', h.textContent)

    const row = document.createElement('div')
    row.className = 'mt-5 flex justify-end gap-2'
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    cancel.textContent = 'Abbrechen'
    const ok = document.createElement('button')
    ok.type = 'button'
    ok.className = `rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm ${
      opts.danger === false ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-rose-600 hover:bg-rose-500'
    }`
    ok.textContent = opts.confirmLabel ?? 'Löschen'

    row.append(cancel, ok)
    panel.append(h, p, row)
    root.append(backdrop, panel)
    document.body.appendChild(root)
    ok.focus()

    function done(answer: boolean) {
      window.removeEventListener('keydown', onKey, true)
      root.remove()
      prevFocus?.focus?.()
      resolve(answer)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        done(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    backdrop.addEventListener('click', () => done(false))
    cancel.addEventListener('click', () => done(false))
    ok.addEventListener('click', () => done(true))
  })
}

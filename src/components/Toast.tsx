import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface ToastData {
  id: number
  message: string
  action?: { label: string; onClick: () => void }
}

type ShowToast = (message: string, action?: ToastData['action']) => void

const ToastContext = createContext<ShowToast>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

/** Kurze Meldung unten am Bildschirm, optional mit Aktion (z. B. „Rückgängig“). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<ShowToast>((message, action) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), message, action })
    timer.current = window.setTimeout(() => setToast(null), 5000)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="fixed inset-x-4 bottom-20 z-20 mx-auto flex max-w-sm items-center justify-between gap-4 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg md:bottom-6 dark:bg-slate-100 dark:text-slate-900"
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              className="font-semibold text-indigo-300 hover:text-indigo-200 dark:text-indigo-600"
              onClick={() => {
                toast.action!.onClick()
                setToast(null)
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}

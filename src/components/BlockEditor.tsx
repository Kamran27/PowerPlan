import { useEffect, useState, type FormEvent } from 'react'
import type { Task, TimeBlock } from '../db'
import { toMinutes } from '../lib/time'
import { addBlock, deleteBlock, restoreBlock, updateBlock } from '../lib/timeblocks'
import { useToast } from './Toast'

export type BlockDraft = Omit<TimeBlock, 'id'> & { id?: string }

const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800'

/** Dialog zum Anlegen/Bearbeiten eines Zeitblocks. */
export default function BlockEditor({ draft, task, onClose }: { draft: BlockDraft; task?: Task; onClose: () => void }) {
  const [title, setTitle] = useState(draft.title)
  const [start, setStart] = useState(draft.start)
  const [end, setEnd] = useState(draft.end)
  const toast = useToast()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const timeError = start && end && toMinutes(end) <= toMinutes(start) ? 'Das Ende muss nach dem Beginn liegen.' : ''
  const canSave = !timeError && start && end && (task || title.trim())

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    const data = { date: draft.date, start, end, title: task ? task.title : title.trim(), taskId: draft.taskId }
    if (draft.id) await updateBlock(draft.id, data)
    else await addBlock(data)
    onClose()
  }

  async function remove() {
    if (!draft.id) return
    const original = { ...draft, id: draft.id } as TimeBlock
    await deleteBlock(draft.id)
    toast('Block gelöscht', { label: 'Rückgängig', onClick: () => restoreBlock(original) })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={save}
        role="dialog"
        aria-label={draft.id ? 'Block bearbeiten' : 'Neuer Block'}
        className="grid w-full max-w-sm gap-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
      >
        <h2 className="font-semibold">{draft.id ? 'Block bearbeiten' : 'Neuer Block'}</h2>
        {task ? (
          <p className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Aufgabe: </span>
            {task.title}
          </p>
        ) : (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Was machst du in dieser Zeit?"
            aria-label="Titel"
            className={fieldClass}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-xs text-slate-500 dark:text-slate-400">
            Beginn
            <input type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} className={fieldClass} />
          </label>
          <label className="grid gap-1 text-xs text-slate-500 dark:text-slate-400">
            Ende
            <input type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} className={fieldClass} />
          </label>
        </div>
        {timeError && <p className="text-sm text-rose-600 dark:text-rose-400">{timeError}</p>}
        <div className="mt-1 flex items-center gap-2">
          {draft.id && (
            <button type="button" onClick={remove} className="rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
              Löschen
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Abbrechen
            </button>
            <button type="submit" disabled={!canSave} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40">
              Speichern
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

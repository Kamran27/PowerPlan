/** Stile für die „Pillen“ in den Aufgaben-Masken (siehe components/TaskFields.tsx). */

export const pill =
  'inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80'
export const pillActive =
  '!bg-indigo-50 !text-indigo-700 ring-1 ring-indigo-200 dark:!bg-indigo-500/15 dark:!text-indigo-300 dark:ring-indigo-500/30'
export const bareSelect = 'cursor-pointer appearance-none bg-transparent outline-none [field-sizing:content]'

/** Weiches Eingabefeld (Notizen u. Ä.) passend zu den Pillen */
export const softField =
  'w-full rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/50 dark:bg-slate-800/60 dark:ring-slate-700 dark:focus:bg-slate-900'

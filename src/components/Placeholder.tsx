export default function Placeholder({ milestone, text }: { milestone: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
      <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
        {milestone}
      </span>
      <p className="mt-3 text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  )
}

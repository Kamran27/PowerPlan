import { Cat, type CatPose } from './Cats'

/** Seitenkopf mit Titel, Untertitel – und (fast) überall einer kleinen Katze rechts. */
export default function PageHeader({ title, subtitle, cat }: { title: string; subtitle?: string; cat?: CatPose }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4 md:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {cat && <Cat pose={cat} className="shrink-0 text-slate-400 dark:text-slate-500" />}
    </header>
  )
}

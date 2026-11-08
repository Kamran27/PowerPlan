import PageHeader from '../components/PageHeader'
import Placeholder from '../components/Placeholder'

function greeting(hour: number) {
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export default function Heute() {
  const now = new Date()
  const dateLabel = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <PageHeader title={greeting(now.getHours())} subtitle={dateLabel} />
      <div className="grid gap-4">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Tagesfortschritt</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">0 Punkte</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full w-0 rounded-full bg-indigo-500" />
          </div>
        </section>
        <Placeholder milestone="M2" text="Hier erscheint dein Tagesplan mit Zeitblöcken." />
      </div>
    </>
  )
}

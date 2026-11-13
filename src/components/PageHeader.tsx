export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6 md:mb-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </header>
  )
}

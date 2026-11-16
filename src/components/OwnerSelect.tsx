import { softField } from '../lib/pillStyles'
import { shortName } from '../lib/spaces'

/** „Für wen?“ – gemeinsam (wird geteilt) oder persönlich für eine Person */
export default function OwnerSelect({
  value,
  onChange,
  people,
  me,
  label = 'Für wen',
}: {
  value: string
  onChange: (v: string) => void
  people: string[]
  me?: string
  label?: string
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} title={label} className={`${softField} !w-auto`}>
      <option value="">👥 Gemeinsam</option>
      {people.map((p) => (
        <option key={p} value={p}>
          👤 {p === me ? 'Nur ich' : `Nur ${shortName(p)}`}
        </option>
      ))}
    </select>
  )
}

/** Kleines Etikett „👤 Name“ für persönliche Positionen */
export function OwnerBadge({ owner, me }: { owner?: string; me?: string }) {
  if (!owner) return null
  return (
    <span className="ml-1.5 rounded-full bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30">
      👤 {owner === me ? 'Ich' : shortName(owner)}
    </span>
  )
}

/** Gemeinsame Fixkosten: wer zahlt sie (Dauerauftrag)? Leer = Gemeinschaftskonto */
export function PayerSelect({ value, onChange, people, me }: { value: string; onChange: (v: string) => void; people: string[]; me?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Wer zahlt" title="Wer zahlt" className={`${softField} !w-auto`}>
      <option value="">🏦 Gemeinschaftskonto</option>
      {people.map((p) => (
        <option key={p} value={p}>
          💳 zahlt {p === me ? 'ich' : shortName(p)}
        </option>
      ))}
    </select>
  )
}

export function PayerBadge({ payer, me }: { payer?: string; me?: string }) {
  return (
    <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {payer ? `💳 ${payer === me ? 'ich' : shortName(payer)}` : '🏦 Konto'}
    </span>
  )
}

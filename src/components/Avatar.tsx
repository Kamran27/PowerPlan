import { initials, PERSON_COLORS, personColorIndex, shortName } from '../lib/spaces'

/** Runder Initialen-Kreis in der festen Farbe der Person (z. B. „AM“ für anna.muster@…). */
export default function Avatar({ email, size = 'md', me }: { email?: string; size?: 'sm' | 'md'; me?: string }) {
  const name = email === me ? 'Ich' : shortName(email)
  const dims = size === 'sm' ? 'size-5 text-[9px]' : 'size-7 text-[11px]'
  return (
    <span
      title={name}
      aria-label={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ${dims} ${PERSON_COLORS[personColorIndex(email)]}`}
    >
      {initials(email)}
    </span>
  )
}

import { useState } from 'react'
import { haptic } from '../lib/useIsMobile'
import { PeekingCat } from './Cats'

const SOUNDS = ['Miau!', 'Mrrr…', 'Miau? 🐾', 'Prrr ♥']

/** Die Katze über den Tagesringen: antippen → sie taucht kurz ab und sagt etwas. */
export default function TapCat({ className = '' }: { className?: string }) {
  const [say, setSay] = useState<{ text: string; key: number } | null>(null)
  return (
    <button
      type="button"
      onClick={() => {
        haptic(8)
        setSay({ text: SOUNDS[Math.floor(Math.random() * SOUNDS.length)], key: Date.now() })
      }}
      aria-label="Katze streicheln"
      className={`overflow-visible ${className}`}
    >
      {say && (
        <span
          key={say.key}
          onAnimationEnd={() => setSay(null)}
          className="cat-bubble pointer-events-none absolute -top-7 right-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium whitespace-nowrap text-slate-700 shadow ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
        >
          {say.text}
        </span>
      )}
      <span key={say?.key ?? 0} className={`block ${say ? 'cat-duck' : ''}`}>
        <PeekingCat className="w-12" />
      </span>
    </button>
  )
}

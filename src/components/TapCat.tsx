import { PeekingCat } from './Cats'

/** Die Katze über den Tagesringen. Antippen wie bei allen Katzen: siehe lib/petCats.ts. */
export default function TapCat({ className = '' }: { className?: string }) {
  return (
    <span className={`overflow-visible ${className}`}>
      <PeekingCat className="w-12" />
    </span>
  )
}

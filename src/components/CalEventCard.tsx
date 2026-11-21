import type { Calendar } from '../db'
import type { CalEvent } from '../lib/calendar'
import { calColor } from '../lib/calendars'
import { DAY_START, PX_PER_MIN, toMinutes } from '../lib/time'

/** Termin aus einem externen Kalender (iCloud/Google) im Zeitraster – nur lesen. */
export default function CalEventCard({ event, calendar, lane, lanes }: { event: CalEvent; calendar?: Calendar; lane: number; lanes: number }) {
  const start = toMinutes(event.start!)
  const end = Math.max(toMinutes(event.end!), start + 15)
  const short = end - start < 40
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      title={`📅 ${event.title}\n${event.start}–${event.end} Uhr${event.location ? `\n📍 ${event.location}` : ''}${calendar ? `\n${calendar.name}` : ''}`}
      className={`absolute cursor-default overflow-hidden rounded-lg border-l-4 border-dashed px-2 text-sm opacity-90 shadow-sm ${calColor(calendar?.color).card}`}
      style={{
        top: (start - DAY_START) * PX_PER_MIN + 1,
        height: (end - start) * PX_PER_MIN - 2,
        left: `calc(${(lane / lanes) * 100}% + 2px)`,
        width: `calc(${100 / lanes}% - 4px)`,
      }}
    >
      <div className={`truncate font-medium ${short ? 'text-xs leading-5' : 'pt-0.5'}`}>
        <span aria-hidden>📅 </span>
        {event.title}
      </div>
      {!short && (
        <div className="truncate text-xs opacity-75">
          {event.start}–{event.end}
          {event.location ? ` · ${event.location}` : ''}
        </div>
      )}
    </div>
  )
}

/** Ganztägige Termine als kleine Chips (über dem Zeitraster) */
export function AllDayChips({ events, calendars }: { events: CalEvent[]; calendars: Map<string, Calendar> }) {
  const all = events.filter((e) => e.allDay)
  if (!all.length) return null
  return (
    <ul className="flex min-w-0 flex-wrap gap-1">
      {all.map((e) => (
        <li
          key={e.id}
          title={`${e.title}${calendars.get(e.calId) ? ` · ${calendars.get(e.calId)!.name}` : ''}`}
          className={`min-w-0 max-w-full truncate rounded-md border-l-4 px-1.5 py-0.5 text-[11px] font-medium ${calColor(calendars.get(e.calId)?.color).card}`}
        >
          📅 {e.title}
        </li>
      ))}
    </ul>
  )
}

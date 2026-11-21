import { describe, expect, it } from 'vitest'
import { parseIcs } from './calendar'

// Test läuft in der Zeitzone Europe/Berlin (siehe Aufruf)
const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VTIMEZONE
TZID:Europe/Berlin
BEGIN:STANDARD
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
UID:yoga
SUMMARY:Yoga
DTSTART;TZID=Europe/Berlin:20261102T183000
DTEND;TZID=Europe/Berlin:20261102T193000
RRULE:FREQ=WEEKLY;BYDAY=MO
EXDATE;TZID=Europe/Berlin:20261109T183000
END:VEVENT
BEGIN:VEVENT
UID:yoga
RECURRENCE-ID;TZID=Europe/Berlin:20261116T183000
SUMMARY:Yoga (verschoben)
DTSTART;TZID=Europe/Berlin:20261117T200000
DTEND;TZID=Europe/Berlin:20261117T210000
END:VEVENT
BEGIN:VEVENT
UID:urlaub
SUMMARY:Urlaub
DTSTART;VALUE=DATE:20261120
DTEND;VALUE=DATE:20261122
END:VEVENT
BEGIN:VEVENT
UID:utc
SUMMARY:Call
DTSTART:20261118T090000Z
DTEND:20261118T100000Z
LOCATION:Zoom
END:VEVENT
END:VCALENDAR`

describe('Kalender (.ics) einlesen', () => {
  it('Serien, Ausnahmen, ganztägig, UTC', async () => {
    const ev = await parseIcs(ICS, 'c1', '2026-11-01', '2026-11-30')
    const s = ev.map((e) => `${e.date} ${e.allDay ? 'ganztägig' : `${e.start}-${e.end}`} ${e.title}`)
    expect(s).toEqual([
      '2026-11-02 18:30-19:30 Yoga',
      // 09.11. ausgelassen (EXDATE), 16.11. auf den 17.11. verschoben
      '2026-11-17 20:00-21:00 Yoga (verschoben)',
      '2026-11-18 10:00-11:00 Call',
      '2026-11-20 ganztägig Urlaub',
      '2026-11-21 ganztägig Urlaub',
      '2026-11-23 18:30-19:30 Yoga',
      '2026-11-30 18:30-19:30 Yoga',
    ])
    expect(ev.find((e) => e.title === 'Call')?.location).toBe('Zoom')
  })
  it('nur der gewünschte Zeitraum', async () => {
    const ev = await parseIcs(ICS, 'c1', '2026-11-23', '2026-11-23')
    expect(ev.map((e) => e.title)).toEqual(['Yoga'])
  })
})

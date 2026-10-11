import { describe, expect, it } from 'vitest'
import { parseIcsContent } from './parser'

describe('iCalendar Parser', () => {
  it('parses weekly VEVENT with BYDAY', () => {
    const sampleIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Kuliah Pemrograman Web
DTSTART:20261012T080000
DTEND:20261012T103000
RRULE:FREQ=WEEKLY;BYDAY=MO
END:VEVENT
END:VCALENDAR`

    const parsed = parseIcsContent(sampleIcs)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.judul).toBe('Kuliah Pemrograman Web')
    expect(parsed[0]?.hari).toBe(1)
    expect(parsed[0]?.jam_mulai).toBe('08:00')
    expect(parsed[0]?.jam_selesai).toBe('10:30')
  })

  it('parses multiple recurring days in single event', () => {
    const sampleIcs = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Tutorial Kalkulus
DTSTART:20261013T130000
DTEND:20261013T150000
RRULE:FREQ=WEEKLY;BYDAY=TU,TH
END:VEVENT
END:VCALENDAR`

    const parsed = parseIcsContent(sampleIcs)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]?.hari).toBe(2)
    expect(parsed[1]?.hari).toBe(4)
  })

  it('parses non-RRULE event using DTSTART date of week', () => {
    const sampleIcs = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Kelas Khusus
DTSTART:20261014T090000
DTEND:20261014T110000
END:VEVENT
END:VCALENDAR`

    const parsed = parseIcsContent(sampleIcs)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.hari).toBe(3)
    expect(parsed[0]?.jam_mulai).toBe('09:00')
    expect(parsed[0]?.jam_selesai).toBe('11:00')
  })
})

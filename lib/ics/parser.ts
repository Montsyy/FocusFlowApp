export interface ParsedIcsEvent {
  judul: string
  hari: number
  jam_mulai: string
  jam_selesai: string
}

const dayCodeMap: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

function parseIcsTime(dtString: string): { hours: string; minutes: string; dateDay: number } | null {
  const match = dtString.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/)
  if (!match) {
    return null
  }

  const year = parseInt(match[1] ?? '1970', 10)
  const month = parseInt(match[2] ?? '1', 10) - 1
  const day = parseInt(match[3] ?? '1', 10)
  const hours = match[4] ?? '00'
  const minutes = match[5] ?? '00'

  const date = new Date(Date.UTC(year, month, day))
  const dateDay = date.getUTCDay()

  return { hours, minutes, dateDay }
}

export function parseIcsContent(icsContent: string): ParsedIcsEvent[] {
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  const results: ParsedIcsEvent[] = []
  let insideEvent = false
  let currentSummary = ''
  let currentDtStart = ''
  let currentDtEnd = ''
  let currentRrule = ''

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === 'BEGIN:VEVENT') {
      insideEvent = true
      currentSummary = ''
      currentDtStart = ''
      currentDtEnd = ''
      currentRrule = ''
      continue
    }

    if (line === 'END:VEVENT') {
      if (insideEvent) {
        const startParsed = parseIcsTime(currentDtStart)
        const endParsed = parseIcsTime(currentDtEnd)

        if (startParsed) {
          const jamMulai = `${startParsed.hours}:${startParsed.minutes}`
          let jamSelesai = endParsed
            ? `${endParsed.hours}:${endParsed.minutes}`
            : ''

          if (!jamSelesai || jamSelesai <= jamMulai) {
            const endH = (parseInt(startParsed.hours, 10) + 1) % 24
            jamSelesai = `${String(endH).padStart(2, '0')}:${startParsed.minutes}`
          }

          const judul = currentSummary.trim() || 'Jadwal Tanpa Judul'

          const byDayMatch = currentRrule.match(/BYDAY=([A-Z,]+)/)
          if (byDayMatch && byDayMatch[1]) {
            const dayCodes = byDayMatch[1].split(',')
            for (const code of dayCodes) {
              const cleanCode = code.replace(/[^A-Z]/g, '')
              const dayNum = dayCodeMap[cleanCode]
              if (dayNum !== undefined) {
                results.push({
                  judul,
                  hari: dayNum,
                  jam_mulai: jamMulai,
                  jam_selesai: jamSelesai,
                })
              }
            }
          } else {
            results.push({
              judul,
              hari: startParsed.dateDay,
              jam_mulai: jamMulai,
              jam_selesai: jamSelesai,
            })
          }
        }
      }
      insideEvent = false
      continue
    }

    if (!insideEvent) {
      continue
    }

    if (line.startsWith('SUMMARY:')) {
      currentSummary = line.substring('SUMMARY:'.length)
    } else if (line.startsWith('DTSTART')) {
      const idx = line.indexOf(':')
      if (idx !== -1) {
        currentDtStart = line.substring(idx + 1)
      }
    } else if (line.startsWith('DTEND')) {
      const idx = line.indexOf(':')
      if (idx !== -1) {
        currentDtEnd = line.substring(idx + 1)
      }
    } else if (line.startsWith('RRULE:')) {
      currentRrule = line.substring('RRULE:'.length)
    }
  }

  return results
}

'use client'

import { useRef, useState, useMemo, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import idLocale from '@fullcalendar/core/locales/id'
import type { FixedEvent, ScheduleBlock, Task } from '@/lib/types'
import type { SelectedEventData } from './BlockDetail'
import { CalendarToolbar } from './CalendarToolbar'

interface CalendarProps {
  fixedEvents: FixedEvent[]
  scheduleBlocks: ScheduleBlock[]
  tasks: Task[]
  onSelectEvent: (event: SelectedEventData) => void
  initialDate?: string
  onWeekChange?: (weekStart: string, title: string) => void
}

export function Calendar({
  fixedEvents,
  scheduleBlocks,
  tasks,
  onSelectEvent,
  initialDate,
  onWeekChange,
}: CalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null)
  const [weekTitle, setWeekTitle] = useState('')
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  )

  useEffect(() => {
    function setTz() {
      const el = document.querySelector(
        '.fc-scrollgrid-section-header .fc-timegrid-axis-cushion'
      )
      if (el && el.textContent !== 'GMT+07') {
        el.textContent = 'GMT+07'
      }
    }
    setTz()
    const timer = setInterval(setTz, 400)
    return () => clearInterval(timer)
  }, [weekTitle])

  const taskMap = useMemo(() => {
    const map = new Map<string, Task>()
    tasks.forEach((t) => map.set(t.id, t))
    return map
  }, [tasks])

  const events = useMemo(() => {
    const fixedItems = fixedEvents.map((fe) => ({
      id: `fixed-${fe.id}`,
      title: `📌 ${fe.judul}`,
      daysOfWeek: [fe.hari],
      startTime: fe.jam_mulai.substring(0, 5),
      endTime: fe.jam_selesai.substring(0, 5),
      backgroundColor: '#64748B',
      borderColor: '#475569',
      textColor: '#FFFFFF',
      editable: false,
      display: 'block' as const,
      extendedProps: {
        isFixed: true,
        fixedEvent: fe,
      },
    }))

    const blockItems = scheduleBlocks.map((sb) => {
      const task = sb.task_id ? taskMap.get(sb.task_id) : undefined
      const titleText = task?.judul || sb.alasan_ai || 'Blok Jadwal'
      const displayTitle = `${sb.dikunci ? '🔒 ' : ''}${titleText}`

      return {
        id: sb.id,
        title: displayTitle,
        start: sb.mulai,
        end: sb.selesai,
        backgroundColor: sb.dimodifikasi_manusia ? '#10B981' : '#3B82F6',
        borderColor: sb.dimodifikasi_manusia ? '#059669' : '#2563EB',
        textColor: '#FFFFFF',
        editable: false,
        display: 'block' as const,
        extendedProps: {
          isFixed: false,
          block: sb,
          taskTitle: titleText,
        },
      }
    })

    return [...fixedItems, ...blockItems]
  }, [fixedEvents, scheduleBlocks, taskMap])

  function handlePrev() {
    calendarRef.current?.getApi().prev()
  }

  function handleNext() {
    calendarRef.current?.getApi().next()
  }

  function handleToday() {
    calendarRef.current?.getApi().today()
  }

  return (
    <div className="flex flex-col h-[740px] rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <CalendarToolbar
        weekTitle={weekTitle}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        currentWeekStart={currentWeekStart}
      />

      <div className="mt-3 flex-1 min-h-0 overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          initialDate={initialDate}
          locales={[idLocale]}
          locale="id"
          firstDay={0}
          slotDuration="01:00:00"
          slotLabelInterval="01:00:00"
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          scrollTime="07:00:00"
          allDaySlot={false}
          nowIndicator={false}
          height="100%"
          expandRows={true}
          headerToolbar={false}
          dayHeaderContent={(arg) => {
            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
            const dayName = dayNames[arg.date.getDay()]
            const dayNum = arg.date.getDate()
            const isToday = arg.isToday

            return (
              <div className="flex flex-col items-center justify-center py-2 select-none">
                <span
                  className={`text-[11px] font-semibold tracking-wider uppercase ${
                    isToday
                      ? 'text-indigo-600 font-bold dark:text-indigo-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {dayName}
                </span>
                <span
                  className={`mt-0.5 flex h-8 w-8 items-center justify-center text-2xl font-normal transition-colors ${
                    isToday
                      ? 'rounded-full bg-indigo-600 font-medium text-white shadow-sm'
                      : 'text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {dayNum}
                </span>
              </div>
            )
          }}
          slotLabelContent={(arg) => {
            const hour = arg.date.getHours()
            if (hour === 0) {
              return <span className="opacity-0 select-none">0</span>
            }
            const ampm = hour >= 12 ? 'PM' : 'AM'
            const hour12 = hour % 12 === 0 ? 12 : hour % 12
            return (
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 select-none pr-1.5">
                {hour12} {ampm}
              </span>
            )
          }}
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            meridiem: 'short',
          }}
          eventContent={(arg) => {
            const timeText = arg.timeText
            const title = arg.event.title
            return (
              <div className="flex flex-col h-full w-full overflow-hidden p-1 text-[11px] leading-tight select-none cursor-pointer">
                <span className="font-semibold truncate">{title}</span>
                {timeText && <span className="text-[10px] opacity-85 truncate mt-0.5">{timeText}</span>}
              </div>
            )
          }}
          events={events}
          datesSet={(arg) => {
            setWeekTitle(arg.view.title)
            const iso = arg.start.toISOString().split('T')[0]
            setCurrentWeekStart(iso)
            onWeekChange?.(iso, arg.view.title)
          }}
          eventClick={(info) => {
            const props = info.event.extendedProps
            if (props.isFixed) {
              onSelectEvent({
                type: 'fixed',
                id: info.event.id,
                title: info.event.title.replace('📌 ', ''),
                start: info.event.startStr,
                end: info.event.endStr,
                fixedEvent: props.fixedEvent as FixedEvent,
              })
            } else {
              onSelectEvent({
                type: 'block',
                id: info.event.id,
                title: props.taskTitle as string,
                start: info.event.startStr,
                end: info.event.endStr,
                block: props.block as ScheduleBlock,
              })
            }
          }}
        />
      </div>
    </div>
  )
}

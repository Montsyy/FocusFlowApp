'use client'

import { useRef, useState, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import idLocale from '@fullcalendar/core/locales/id'
import type { FixedEvent, ScheduleBlock, Task } from '@/lib/types'
import type { SelectedEventData } from './BlockDetail'

interface CalendarProps {
  fixedEvents: FixedEvent[]
  scheduleBlocks: ScheduleBlock[]
  tasks: Task[]
  onSelectEvent: (event: SelectedEventData) => void
}

export function Calendar({
  fixedEvents,
  scheduleBlocks,
  tasks,
  onSelectEvent,
}: CalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null)
  const [weekTitle, setWeekTitle] = useState('')

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
    <div className="flex flex-col h-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            <button
              type="button"
              onClick={handlePrev}
              title="Minggu Sebelumnya"
              className="rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-white hover:shadow-sm dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="rounded-lg px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-white hover:shadow-sm dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handleNext}
              title="Minggu Berikutnya"
              className="rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-white hover:shadow-sm dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              ▶
            </button>
          </div>

          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 capitalize">
            {weekTitle}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
            Jadwal Tetap
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Rencana AI
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Diubah Pengguna
          </span>
          <span className="inline-flex items-center gap-1">
            🔒 Terkunci
          </span>
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-[560px]">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locales={[idLocale]}
          locale="id"
          firstDay={1}
          slotDuration="00:30:00"
          slotMinTime="06:00:00"
          slotMaxTime="23:30:00"
          allDaySlot={false}
          nowIndicator={true}
          height="auto"
          expandRows={true}
          headerToolbar={false}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          events={events}
          datesSet={(arg) => {
            setWeekTitle(arg.view.title)
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

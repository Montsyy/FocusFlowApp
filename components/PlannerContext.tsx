'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import type { ScheduleBlock } from '@/lib/types'
import type { UnplacedTask } from '@/lib/scheduler'
import { useToast } from './Toast'

export interface CapacityInfo {
  totalRequiredMinutes: number
  totalAvailableMinutes: number
  percentage: number
}

export interface GenerateScheduleResult {
  blocks: ScheduleBlock[]
  unplaced: UnplacedTask[]
  capacity: CapacityInfo
  totalRequiredMinutes?: number
  totalAvailableMinutes?: number
  meta?: {
    provider: string
    model: string
    fallbackUsed: boolean
  }
}

export interface GenerateScheduleOptions {
  weekStart?: string
  silent?: boolean
  showCalendarLink?: boolean
  currentMinggu?: string
  customSuccessMessage?: string
}

interface PlannerContextValue {
  isGenerating: boolean
  scheduleBlocks: ScheduleBlock[]
  unplacedTasks: UnplacedTask[]
  capacity: CapacityInfo | null
  setScheduleBlocks: React.Dispatch<React.SetStateAction<ScheduleBlock[]>>
  setUnplacedTasks: React.Dispatch<React.SetStateAction<UnplacedTask[]>>
  generateSchedule: (
    options?: GenerateScheduleOptions
  ) => Promise<GenerateScheduleResult | null>
}

const PlannerContext = createContext<PlannerContextValue | null>(null)

interface PlannerProviderProps {
  children: ReactNode
  initialBlocks?: ScheduleBlock[]
}

export function PlannerProvider({
  children,
  initialBlocks = [],
}: PlannerProviderProps) {
  const { showToast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>(initialBlocks)
  const [unplacedTasks, setUnplacedTasks] = useState<UnplacedTask[]>([])
  const [capacity, setCapacity] = useState<CapacityInfo | null>(null)

  const generateSchedule = useCallback(
    async (options: GenerateScheduleOptions = {}) => {
      setIsGenerating(true)
      try {
        const res = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekStart: options.weekStart }),
        })

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(errData.error || 'Gagal menyusun jadwal otomatis')
        }

        const data = (await res.json()) as GenerateScheduleResult
        if (data.blocks) {
          setScheduleBlocks(data.blocks)
        }
        if (data.unplaced) {
          setUnplacedTasks(data.unplaced)
        }
        if (data.capacity) {
          setCapacity(data.capacity)
        }

        if (!options.silent) {
          const count = data.blocks?.length ?? 0
          const unplacedCount = data.unplaced?.length ?? 0

          const defaultMinggu =
            options.currentMinggu ||
            options.weekStart ||
            new Date().toISOString().split('T')[0]

          const action = options.showCalendarLink
            ? {
                label: 'Lihat di Kalender',
                href: `/dashboard/kalender?minggu=${defaultMinggu}`,
              }
            : undefined

          if (options.customSuccessMessage) {
            showToast(options.customSuccessMessage, 'success', action)
          } else if (count > 0) {
            showToast(
              `${count} blok tugas berhasil disusun ke kalender! 🎉`,
              'success',
              action
            )
          } else if (unplacedCount > 0) {
            showToast(
              'Tugas belum dapat dijadwalkan karena batasan deadline atau jam aktif.',
              'info',
              action
            )
          } else {
            showToast('Semua jadwal sudah tersinkronisasi.', 'info', action)
          }
        }

        return data
      } catch (err) {
        if (!options.silent) {
          const msg =
            err instanceof Error ? err.message : 'Gagal menyusun jadwal otomatis'
          showToast(msg, 'error')
        }
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [showToast]
  )

  return (
    <PlannerContext.Provider
      value={{
        isGenerating,
        scheduleBlocks,
        unplacedTasks,
        capacity,
        setScheduleBlocks,
        setUnplacedTasks,
        generateSchedule,
      }}
    >
      {children}
    </PlannerContext.Provider>
  )
}

export function usePlanner() {
  const context = useContext(PlannerContext)
  if (!context) {
    return {
      isGenerating: false,
      scheduleBlocks: [],
      unplacedTasks: [],
      capacity: null,
      setScheduleBlocks: () => {},
      setUnplacedTasks: () => {},
      generateSchedule: async () => null,
    }
  }
  return context
}

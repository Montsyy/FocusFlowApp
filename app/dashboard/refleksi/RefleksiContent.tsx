import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { computeWeeklyStats } from '@/lib/stats/reflection'
import RefleksiShell from './RefleksiShell'
import type { Profile, Task, ScheduleBlock, EnergyLog, Reflection } from '@/lib/types'

function getInitialWeekStart(): string {
  const today = new Date()
  const day = today.getDay()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - day)
  return sunday.toISOString().split('T')[0]!
}

export default async function RefleksiContent({
  searchParams,
}: {
  searchParams?: Promise<{ minggu?: string }>
}) {
  await connection()
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('nama')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileData as Pick<Profile, 'nama'> | null
  const nama =
    profile?.nama ||
    (user.user_metadata?.nama as string) ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split('@')[0] ||
    'Mahasiswa'

  const resolvedParams = searchParams ? await searchParams : {}
  const initialWeekStart = resolvedParams?.minggu || getInitialWeekStart()

  const [{ data: tData }, { data: bData }, { data: eData }, { data: rData }] =
    await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('schedule_blocks').select('*').eq('user_id', user.id),
      supabase.from('energy_logs').select('*').eq('user_id', user.id),
      supabase
        .from('reflections')
        .select('*')
        .eq('user_id', user.id)
        .order('minggu', { ascending: false }),
    ])

  const tasks = (tData as Task[]) ?? []
  const blocks = (bData as ScheduleBlock[]) ?? []
  const energyLogs = (eData as EnergyLog[]) ?? []
  const history = (rData as Reflection[]) ?? []

  const initialStats = computeWeeklyStats({
    tasks,
    blocks,
    energyLogs,
    weekStart: initialWeekStart,
  })

  const initialReflection =
    history.find((r) => r.minggu === initialWeekStart) || null

  return (
    <RefleksiShell
      userNama={nama}
      userEmail={user.email ?? ''}
      initialWeekStart={initialWeekStart}
      initialStats={initialStats}
      initialReflection={initialReflection}
      initialHistory={history}
      initialTasks={tasks}
      initialBlocks={blocks}
      initialEnergyLogs={energyLogs}
    />
  )
}

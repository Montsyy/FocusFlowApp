import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import type { Profile, Task, FixedEvent, ScheduleBlock } from '@/lib/types'
import KalenderShell from './KalenderShell'

export default async function KalenderContent({
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
  const initialMinggu = resolvedParams?.minggu

  const [{ data: tData }, { data: fData }, { data: bData }] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('fixed_events').select('*'),
    supabase.from('schedule_blocks').select('*'),
  ])

  return (
    <KalenderShell
      userNama={nama}
      userEmail={user.email ?? ''}
      initialMinggu={initialMinggu}
      initialTasks={(tData as Task[]) ?? []}
      initialFixedEvents={(fData as FixedEvent[]) ?? []}
      initialBlocks={(bData as ScheduleBlock[]) ?? []}
    />
  )
}

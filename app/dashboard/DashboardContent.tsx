import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import DashboardShell from './DashboardShell'

export default async function DashboardContent(props: {
  searchParams?: Promise<{ minggu?: string }>
}) {
  await connection()
  const params = props.searchParams ? await props.searchParams : undefined
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data } = await supabase
    .from('profiles')
    .select('nama')
    .eq('id', user.id)
    .maybeSingle()

  const profile = data as Pick<Profile, 'nama'> | null

  const nama =
    profile?.nama ||
    (user.user_metadata?.nama as string) ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split('@')[0] ||
    'Mahasiswa'

  return (
    <DashboardShell
      userId={user.id}
      userNama={nama}
      userEmail={user.email ?? ''}
      initialMinggu={params?.minggu}
    />
  )
}

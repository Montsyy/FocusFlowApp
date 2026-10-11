import { createClient } from '@supabase/supabase-js'

async function smokeTest() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    process.stdout.write('Kredensial Supabase belum lengkap di environment.\n')
    process.stdout.write('Harap lengkapi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local.\n')
    return
  }

  try {
    const supabase = createClient(url, key)
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
    if (error) {
      process.stdout.write(`Koneksi Supabase mengembalikan respon dengan pesan: ${error.message}\n`)
    } else {
      process.stdout.write('Berhasil terhubung ke Supabase dan mengakses tabel profiles!\n')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`Gagal menghubungi Supabase: ${message}\n`)
  }
}

void smokeTest()

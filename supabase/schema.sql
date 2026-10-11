create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  nama text,
  jam_aktif_mulai time default '07:00',
  jam_aktif_selesai time default '22:00'
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  judul text not null,
  deadline timestamptz,
  durasi_menit int,
  kesulitan int check (kesulitan >= 1 and kesulitan <= 5),
  kepentingan int check (kepentingan >= 1 and kepentingan <= 5),
  can_split boolean default false,
  sesi_disarankan int default 1,
  status text default 'todo',
  created_at timestamptz default now()
);

create table if not exists fixed_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  judul text not null,
  hari int check (hari >= 0 and hari <= 6),
  jam_mulai time not null,
  jam_selesai time not null
);

create table if not exists energy_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tanggal date not null,
  pagi int,
  siang int,
  malam int,
  mood text,
  constraint unique_user_tanggal unique (user_id, tanggal)
);

create table if not exists schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid references tasks on delete cascade,
  mulai timestamptz not null,
  selesai timestamptz not null,
  dikunci boolean default false,
  dimodifikasi_manusia boolean default false,
  alasan_ai text
);

create table if not exists reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  minggu date not null,
  ringkasan_ai text,
  pertanyaan text,
  jawaban_pengguna text
);

alter table profiles enable row level security;
alter table tasks enable row level security;
alter table fixed_events enable row level security;
alter table energy_logs enable row level security;
alter table schedule_blocks enable row level security;
alter table reflections enable row level security;

create policy "profiles_policy" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "tasks_policy" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "fixed_events_policy" on fixed_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "energy_logs_policy" on energy_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "schedule_blocks_policy" on schedule_blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reflections_policy" on reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create index if not exists idx_tasks_user_id on tasks(user_id);
create index if not exists idx_fixed_events_user_id on fixed_events(user_id);
create index if not exists idx_energy_logs_user_id on energy_logs(user_id);
create index if not exists idx_schedule_blocks_user_id on schedule_blocks(user_id);
create index if not exists idx_schedule_blocks_mulai on schedule_blocks(mulai);
create index if not exists idx_reflections_user_id on reflections(user_id);

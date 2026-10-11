export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  nama: string | null
  jam_aktif_mulai: string
  jam_aktif_selesai: string
}

export interface Task {
  id: string
  user_id: string
  judul: string
  deadline: string | null
  durasi_menit: number | null
  kesulitan: number | null
  kepentingan: number | null
  can_split: boolean
  sesi_disarankan: number
  status: string
  created_at: string
}

export interface FixedEvent {
  id: string
  user_id: string
  judul: string
  hari: number
  jam_mulai: string
  jam_selesai: string
}

export interface EnergyLog {
  id: string
  user_id: string
  tanggal: string
  pagi: number | null
  siang: number | null
  malam: number | null
  mood: string | null
}

export interface ScheduleBlock {
  id: string
  user_id: string
  task_id: string | null
  mulai: string
  selesai: string
  dikunci: boolean
  dimodifikasi_manusia: boolean
  alasan_ai: string | null
}

export interface Reflection {
  id: string
  user_id: string
  minggu: string
  ringkasan_ai: string | null
  pertanyaan: string | null
  jawaban_pengguna: string | null
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
        Relationships: []
      }
      tasks: {
        Row: Task
        Insert: Partial<Task> & { judul: string }
        Update: Partial<Task>
        Relationships: []
      }
      fixed_events: {
        Row: FixedEvent
        Insert: Partial<FixedEvent> & { judul: string; hari: number; jam_mulai: string; jam_selesai: string }
        Update: Partial<FixedEvent>
        Relationships: []
      }
      energy_logs: {
        Row: EnergyLog
        Insert: Partial<EnergyLog> & { tanggal: string }
        Update: Partial<EnergyLog>
        Relationships: []
      }
      schedule_blocks: {
        Row: ScheduleBlock
        Insert: Partial<ScheduleBlock> & { mulai: string; selesai: string }
        Update: Partial<ScheduleBlock>
        Relationships: []
      }
      reflections: {
        Row: Reflection
        Insert: Partial<Reflection> & { minggu: string }
        Update: Partial<Reflection>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

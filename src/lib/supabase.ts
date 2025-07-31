import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript interface for database
export interface DatabaseTimeEntry {
  id: number
  consultant: string
  date: string
  hours: number
  description: string | null
  cost: number
  is_project_manager: boolean
  created_at: string
}

// Interface for creating new entries (without id and created_at)
export interface NewTimeEntry {
  consultant: string
  date: string
  hours: number
  description: string
  cost: number
  is_project_manager: boolean
}

// Service functions for database operations
export const timeEntryService = {
  // Hent alle timeregistreringer
  async getAll(): Promise<DatabaseTimeEntry[]> {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .order('date', { ascending: false })
    
    if (error) {
      console.error('Error fetching time entries:', error)
      throw error
    }
    
    return data || []
  },

  // Opprett ny timeregistrering
  async create(entry: NewTimeEntry): Promise<DatabaseTimeEntry> {
    const { data, error } = await supabase
      .from('time_entries')
      .insert([entry])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating time entry:', error)
      throw error
    }
    
    return data
  },

  // Slett timeregistrering
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting time entry:', error)
      throw error
    }
  },

  // Hent timeregistreringer for spesifikke måneder
  async getByMonths(months: string[]): Promise<DatabaseTimeEntry[]> {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .in('date', months.map(month => `${month}%`))
      .order('date', { ascending: false })
    
    if (error) {
      console.error('Error fetching time entries by months:', error)
      throw error
    }
    
    return data || []
  }
}
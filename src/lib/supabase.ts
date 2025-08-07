import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript interface for database (MED organization_id)
export interface DatabaseTimeEntry {
  id: number
  consultant: string
  date: string
  hours: number
  description: string | null
  cost: number
  is_project_manager: boolean
  created_at: string
  organization_id: string
}

// Interface for creating new entries (MED organization_id)
export interface NewTimeEntry {
  consultant: string
  date: string
  hours: number
  description: string
  cost: number
  is_project_manager: boolean
  organization_id: string
}

// Interface for notater
export interface CustomerNote {
  id: string
  organization_id: string
  title?: string
  content: string
  url?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface NewCustomerNote {
  organization_id: string
  title?: string
  content: string
  url?: string
}

// Service functions for database operations (OPPDATERT)
export const timeEntryService = {
  // Hent alle timeregistreringer for spesifikk organisasjon
  async getAll(organizationId?: string): Promise<DatabaseTimeEntry[]> {
    let query = supabase
      .from('time_entries')
      .select('*')

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.order('date', { ascending: false })
    
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
  async getByMonths(months: string[], organizationId?: string): Promise<DatabaseTimeEntry[]> {
    let query = supabase
      .from('time_entries')
      .select('*')
      .in('date', months.map(month => `${month}%`))

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.order('date', { ascending: false })
    
    if (error) {
      console.error('Error fetching time entries by months:', error)
      throw error
    }
    
    return data || []
  }
}

// Service for notater
export const notesService = {
  async getNotes(organizationId: string): Promise<CustomerNote[]> {
    const { data, error } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching notes:', error)
      throw error
    }
    
    return data || []
  },

  async addNote(organizationId: string, title: string, content: string, url?: string) {
    console.log('🔍 Adding note with:', { organizationId, title, content, url });
    
    // Sjekk current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 Current user:', user, userError);
    
    if (userError || !user) {
      throw new Error('Ikke autentisert');
    }

    const noteData = {
      organization_id: organizationId,
      title: title || null,
      content,
      url: url || null,
      created_by: user.id
    };
    
    console.log('📝 Inserting note data:', noteData);
    
    const { data, error } = await supabase
      .from('customer_notes')
      .insert([noteData])
      .select();
      
    console.log('💾 Insert result:', { data, error });
    
    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    return data;
  },

  async deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_notes')
      .delete()
      .eq('id', noteId)
    
    if (error) {
      console.error('Error deleting note:', error)
      throw error
    }
  }
}
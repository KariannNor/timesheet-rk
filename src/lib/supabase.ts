import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface TimeEntry {
  id: number;
  consultant: string;
  date: string;
  hours: number;
  description?: string;
  cost: number;
  is_project_manager: boolean;
  organization_id: string;
  category?: string; // NEW: Category for time tracking
  created_at: string;
  updated_at: string;
}

export interface CreateTimeEntryData {
  consultant: string;
  date: string;
  hours: number;
  description?: string;
  cost: number;
  is_project_manager: boolean;
  organization_id: string;
  category?: string; // NEW: Category for time tracking
}

export const timeEntryService = {
  async getAll(organizationId: string): Promise<TimeEntry[]> {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('organization_id', organizationId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching time entries:', error);
      throw error;
    }

    return data || [];
  },

  async create(timeEntry: CreateTimeEntryData): Promise<TimeEntry> {
    const { data, error } = await supabase
      .from('time_entries')
      .insert([timeEntry])
      .select()
      .single();

    if (error) {
      console.error('Error creating time entry:', error);
      throw error;
    }

    return data;
  },

  async update(id: number, timeEntry: Partial<CreateTimeEntryData>): Promise<TimeEntry> {
    const { data, error } = await supabase
      .from('time_entries')
      .update(timeEntry)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating time entry:', error);
      throw error;
    }

    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting time entry:', error);
      throw error;
    }
  }
};

export interface CustomerNote {
  id: string;
  organization_id: string;
  title?: string;
  content: string;
  url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteData {
  organization_id: string;
  title?: string;
  content: string;
  url?: string;
}

export const notesService = {
  async getNotes(organizationId: string): Promise<CustomerNote[]> {
    const { data, error } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer notes:', error);
      throw error;
    }

    return data || [];
  },

  async addNote(organizationId: string, title: string, content: string, url?: string): Promise<CustomerNote> {
    const noteData = {
      organization_id: organizationId,
      title: title.trim() || null,
      content: content.trim(),
      url: url?.trim() || null
    };

    const { data, error } = await supabase
      .from('customer_notes')
      .insert([noteData])
      .select()
      .single();

    if (error) {
      console.error('Error creating customer note:', error);
      throw error;
    }

    return data;
  },

  async updateNote(id: string, title: string, content: string, url?: string): Promise<CustomerNote> {
    const updateData = {
      title: title.trim() || null,
      content: content.trim(),
      url: url?.trim() || null
    };

    const { data, error } = await supabase
      .from('customer_notes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer note:', error);
      throw error;
    }

    return data;
  },

  async deleteNote(id: string): Promise<void> {
    const { error } = await supabase
      .from('customer_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting customer note:', error);
      throw error;
    }
  }
};
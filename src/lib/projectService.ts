import { supabase } from './supabase'

/* NEW: typed representation of a DB row from the projects table */
interface DBProjectRow {
  id: string;
  name: string;
  budget_hours?: number | null;
  monthly_budget_hours?: number | null;
  hourly_rate?: number | null;
  consultants?: string[] | null;
  consultant_rates?: Record<string, number> | null;
  consultant_percentages?: Record<string, number> | null;
  project_manager_rate?: number | null;
  project_manager_name?: string | null;
  categories?: string[] | null;
  category?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  access_email?: string | null;
}

export interface Project {
  id: string;
  name: string;
  budgetHours?: number | null;
  monthlyBudgetHours?: number | null;
  hourlyRate?: number;
  consultants?: string[];
  consultantRates?: Record<string, number>;
  consultantPercentages?: Record<string, number>;
  categories?: string[];
  projectManagerRate?: number;
  projectManagerName?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  accessEmail?: string | null;
}

export interface CreateProjectData {
  name: string;
  budgetHours?: number | null;
  monthlyBudgetHours?: number | null;
  hourlyRate?: number;
  consultants?: string[];
  consultantRates?: Record<string, number>;
  consultantPercentages?: Record<string, number>;
  categories?: string[];
  projectManagerRate?: number;
  projectManagerName?: string;
  category?: string;
  accessEmail?: string | null;
}

// NEW: helper to map DB row -> Project
const mapRowToProject = (row: DBProjectRow): Project => ({
  id: row.id,
  name: row.name,
  budgetHours: row.budget_hours ?? null,
  monthlyBudgetHours: row.monthly_budget_hours ?? null,
  hourlyRate: row.hourly_rate ?? 0,
  consultants: row.consultants ?? [],
  consultantRates: row.consultant_rates ?? {},
  consultantPercentages: row.consultant_percentages ?? {},
  projectManagerRate: row.project_manager_rate ?? undefined,
  projectManagerName: row.project_manager_name ?? undefined,
  categories: row.categories ?? [],
  category: row.category ?? undefined,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
  accessEmail: row.access_email ?? null
});

// Get all projects
export const projectService = {
  async getAll(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects') // fjernet generisk type her
      .select('*')

    if (error) {
      console.error('Error fetching projects', error)
      throw error
    }

    // Map DB rows to Project type
    return (data || []).map((row) => mapRowToProject(row as DBProjectRow))
  },

  async create(project: Partial<CreateProjectData>): Promise<Project> {
    const payload: Record<string, unknown> = {
      name: project.name,
      budget_hours: project.budgetHours,
      monthly_budget_hours: project.monthlyBudgetHours,
      hourly_rate: project.hourlyRate,
      consultants: project.consultants,
      consultant_rates: project.consultantRates,
      consultant_percentages: project.consultantPercentages,
      project_manager_rate: project.projectManagerRate,
      project_manager_name: project.projectManagerName,
      categories: project.categories,
      category: project.category,
      access_email: project.accessEmail
    }

    // remove undefined keys without using `any`
    Object.keys(payload).forEach((k) => {
      const v = payload[k as keyof typeof payload]
      if (v === undefined) {
        delete payload[k as keyof typeof payload]
      }
    })

    const { data, error } = await supabase
      .from('projects')
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.error('Error creating project', error)
      throw error
    }

    return mapRowToProject(data as DBProjectRow)
  },

  async update(id: string, project: Partial<CreateProjectData>): Promise<Project> {
    const payload: Record<string, unknown> = {
      name: project.name,
      budget_hours: project.budgetHours,
      monthly_budget_hours: project.monthlyBudgetHours,
      hourly_rate: project.hourlyRate,
      consultants: project.consultants,
      consultant_rates: project.consultantRates,
      consultant_percentages: project.consultantPercentages,
      project_manager_rate: project.projectManagerRate,
      project_manager_name: project.projectManagerName,
      categories: project.categories,
      category: project.category,
      access_email: project.accessEmail
    }

    Object.keys(payload).forEach((k) => {
      const v = payload[k as keyof typeof payload]
      if (v === undefined) {
        delete payload[k as keyof typeof payload]
      }
    })

    const { data, error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating project', error)
      throw error
    }

    return mapRowToProject(data as DBProjectRow)
  },

  async getById(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      // PostgREST specific code may differ; keep defensive check
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'PGRST116'
      ) {
        return null
      }
      console.error('Error fetching project by id', error)
      throw error
    }

    const row = data ?? null
    return row ? mapRowToProject(row as DBProjectRow) : null
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting project', error)
      throw error
    }
  }
}
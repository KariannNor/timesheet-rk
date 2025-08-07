import { supabase } from './supabase';

export interface Project {
  id: string;
  name: string;
  budgetHours: number | null;
  monthlyBudgetHours: number | null;
  hourlyRate: number;
  consultants: string[];
  projectManagerRate: number;
  category: string; // Nytt felt
  createdAt: string;
  updatedAt: string;
  accessEmail: string;
}

export interface CreateProjectData {
  name: string;
  budgetHours?: number | null;
  monthlyBudgetHours?: number | null;
  hourlyRate: number;
  consultants: string[];
  projectManagerRate: number;
  category: string; // Nytt felt
  accessEmail: string;
}

// Add this new interface for database updates
interface ProjectUpdateData {
  name?: string;
  budget_hours?: number | null;
  monthly_budget_hours?: number | null;
  hourly_rate?: number;
  consultants?: string[];
  project_manager_rate?: number;
  category?: string; // Nytt felt
  access_email?: string;
}

export const projectService = {
  async getAll(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }

    const projects = data.map(project => ({
      id: project.id,
      name: project.name,
      budgetHours: project.budget_hours,
      monthlyBudgetHours: project.monthly_budget_hours,
      hourlyRate: project.hourly_rate,
      consultants: project.consultants || [],
      projectManagerRate: project.project_manager_rate,
      category: project.category || 'Prosjekt', // Fallback verdi
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      accessEmail: project.access_email
    }));

    console.log('Loaded projects:', projects.map(p => ({ id: p.id, name: p.name, consultants: p.consultants })));
    return projects;
  },

  async create(projectData: CreateProjectData): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        name: projectData.name,
        budget_hours: projectData.budgetHours,
        monthly_budget_hours: projectData.monthlyBudgetHours,
        hourly_rate: projectData.hourlyRate,
        consultants: projectData.consultants,
        project_manager_rate: projectData.projectManagerRate,
        category: projectData.category, // Nytt felt
        access_email: projectData.accessEmail
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      budgetHours: data.budget_hours,
      monthlyBudgetHours: data.monthly_budget_hours,
      hourlyRate: data.hourly_rate,
      consultants: data.consultants || [],
      projectManagerRate: data.project_manager_rate,
      category: data.category || 'Prosjekt',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      accessEmail: data.access_email
    };
  },

  async update(id: string, projectData: Partial<CreateProjectData>): Promise<Project> {
    const updateData: ProjectUpdateData = {};

    if (projectData.name !== undefined) updateData.name = projectData.name;
    if (projectData.budgetHours !== undefined) updateData.budget_hours = projectData.budgetHours;
    if (projectData.monthlyBudgetHours !== undefined) updateData.monthly_budget_hours = projectData.monthlyBudgetHours;
    if (projectData.hourlyRate !== undefined) updateData.hourly_rate = projectData.hourlyRate;
    if (projectData.consultants !== undefined) updateData.consultants = projectData.consultants;
    if (projectData.projectManagerRate !== undefined) updateData.project_manager_rate = projectData.projectManagerRate;
    if (projectData.category !== undefined) updateData.category = projectData.category; // Nytt felt
    if (projectData.accessEmail !== undefined) updateData.access_email = projectData.accessEmail;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      budgetHours: data.budget_hours,
      monthlyBudgetHours: data.monthly_budget_hours,
      hourlyRate: data.hourly_rate,
      consultants: data.consultants || [],
      projectManagerRate: data.project_manager_rate,
      category: data.category || 'Prosjekt',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      accessEmail: data.access_email
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
};
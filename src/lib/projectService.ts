import { supabase } from './supabase';

export interface Project {
  id: string;
  name: string;
  budgetHours: number | null;
  monthlyBudgetHours: number | null;
  hourlyRate: number;
  consultants: string[];
  consultantRates?: Record<string, number>; // NEW: Individual consultant rates
  projectManagerRate: number;
  projectManagerName: string;
  category: string;
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
  consultantRates?: Record<string, number>; // NEW: Individual consultant rates
  projectManagerRate: number;
  projectManagerName: string;
  category: string;
  accessEmail: string;
}

interface ProjectUpdateData {
  name?: string;
  budget_hours?: number | null;
  monthly_budget_hours?: number | null;
  hourly_rate?: number;
  consultants?: string[];
  consultant_rates?: Record<string, number>; // NEW: Individual consultant rates
  project_manager_rate?: number;
  project_manager_name?: string;
  category?: string;
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
      consultantRates: project.consultant_rates || {}, // NEW: Load individual rates
      projectManagerRate: project.project_manager_rate,
      projectManagerName: project.project_manager_name || 'Kariann (Prosjektleder)',
      category: project.category || 'Prosjekt',
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      accessEmail: project.access_email
    }));

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
        consultant_rates: projectData.consultantRates || {}, // NEW: Save individual rates
        project_manager_rate: projectData.projectManagerRate,
        project_manager_name: projectData.projectManagerName,
        category: projectData.category,
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
      consultantRates: data.consultant_rates || {}, // NEW: Return individual rates
      projectManagerRate: data.project_manager_rate,
      projectManagerName: data.project_manager_name,
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
    if (projectData.consultantRates !== undefined) updateData.consultant_rates = projectData.consultantRates; // NEW: Update individual rates
    if (projectData.projectManagerRate !== undefined) updateData.project_manager_rate = projectData.projectManagerRate;
    if (projectData.projectManagerName !== undefined) updateData.project_manager_name = projectData.projectManagerName;
    if (projectData.category !== undefined) updateData.category = projectData.category;
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
      consultantRates: data.consultant_rates || {}, // NEW: Return individual rates
      projectManagerRate: data.project_manager_rate,
      projectManagerName: data.project_manager_name,
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
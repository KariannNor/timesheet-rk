export interface Project {
  id: string;
  name: string;
  budgetHours: number | null;
  monthlyBudgetHours: number | null;
  hourlyRate: number;
  consultants: string[];
  projectManagerRate: number;
  projectManagerName: string; // Add this field
  createdAt: string;
  updatedAt: string;
  accessEmail?: string;
}

export interface CreateProjectData {
  name: string;
  budgetHours: number | null;
  monthlyBudgetHours: number | null;
  hourlyRate: number;
  consultants: string[];
  projectManagerRate: number;
  projectManagerName: string; // Add this field
  accessEmail?: string;
}
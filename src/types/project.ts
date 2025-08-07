export interface Project {
  id: string;
  name: string;
  budgetHours: number | null;
  monthlyBudgetHours: number | null;
  hourlyRate: number;
  consultants: string[];
  projectManagerRate: number;
  createdAt: string;
  updatedAt: string;
  accessEmail?: string; // Ny epost som får tilgang til prosjektet
}

export interface CreateProjectData {
  name: string;
  budgetHours: number | null;
  monthlyBudgetHours: number | null;
  hourlyRate: number;
  consultants: string[];
  projectManagerRate: number;
  accessEmail?: string; // Ny epost som får tilgang til prosjektet
}
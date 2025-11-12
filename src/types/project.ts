export interface Project {
  id: string;
  name: string;
  budgetHours: number | null;
  monthlyBudgetHours: number | null;
  hourlyRate: number;
  consultants: string[];
  consultantRates?: Record<string, number>;
  consultantPercentages?: Record<string, number>; // NEW
  categories?: string[]; // NEW
  projectManagerRate: number;
  projectManagerName: string;
  createdAt: string;
  updatedAt: string;
  accessEmail?: string;
}

export interface CreateProjectData {
  name: string;
  budgetHours?: number | null;
  monthlyBudgetHours?: number | null;
  hourlyRate: number;
  consultants: string[];
  consultantRates?: Record<string, number>;
  consultantPercentages?: Record<string, number>; // NEW
  categories?: string[]; // NEW
  projectManagerRate: number;
  projectManagerName: string;
  accessEmail?: string;
}
// ...existing code...
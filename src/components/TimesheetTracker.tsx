import CustomerNotes from './CustomerNotes'
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { timeEntryService } from '../lib/supabase';
import { projectService, type Project } from '../lib/projectService';
import type { User } from '@supabase/supabase-js';

// Oppdater TimeEntry interface til å matche database-strukturen
interface TimeEntry {
  id: number;
  consultant: string;
  date: string;
  hours: number;
  description: string;
  cost: number;
  isProjectManager: boolean;
  category?: string; // NEW: Category for time tracking
}

interface NewEntry {
  consultant: string;
  date: string;
  hours: string;
  description: string;
  category: string; // NEW: Category for time tracking
}

interface ConsultantStat {
  name: string;
  hours: number;
  cost: number;
  percentage: number;
}

interface ProjectManagerStat {
  name: string;
  hours: number;
  cost: number;
}

interface MonthlyHistoryItem {
  month: string;
  hours: number;
  cost: number;
  entries: number;
}

// NEW: Interface for category statistics
interface CategoryStat {
  name: string;
  hours: number;
  cost: number;
  percentage: number;
}

interface TimesheetTrackerProps {
  user: User | null;
  isReadOnly: boolean;
  organizationId: string;
}

interface OrganizationConfig {
  consultants: Record<string, number>;
  projectManager: Record<string, number>;
  monthlyBudget: number | null;
  totalBudget: number | null;
  organizationName: string;
  categories: string[]; // NEW: Available categories for time tracking
}

// Erstatt getConsultantsAndPricesForOrganization funksjonen
const getConsultantsAndPricesForOrganization = (organizationId: string): OrganizationConfig => {
  switch (organizationId) {
    case 'infunnel':
      return {
        consultants: {
          'Thomas': 1550,
          'Njål': 1550,
          'Mathias': 1550,
          'Madelein': 1550
        },
        projectManager: {
          'Kariann (Prosjektleder)': 1550
        },
        monthlyBudget: null,
        totalBudget: 630,
        organizationName: 'Infunnel/Holmen',
        categories: ['Utvikling', 'Design', 'Møter'] // DEFAULT: Legacy categories
      }
    
    case 'advokatforeningen':
      return {
        consultants: {
          'Thomas': 1574,
          'Marta': 1574,
          'Mateusz': 1574,
          'Tomasz': 1574
        },
        projectManager: {
          'Kariann (Prosjektleder)': 1574
        },
        monthlyBudget: null,
        totalBudget: 1886,
        organizationName: 'Advokatforeningen CRM',
        categories: ['CRM Utvikling', 'Database', 'Testing'] // DEFAULT: Legacy categories
      }
    
    case 'redcross':
    default:
      return {
        consultants: {
            'Njål': 1550,
            'Mathias': 1550,
            'Per': 1550,
            'Pepe': 1550,
            'Ulrikke': 1550,
            'Andri': 1550,
            'Philip': 1550,
            'Nick': 1550,
            'MVP/Rådgiver': 1550
        },
        projectManager: {
          'Kariann (Prosjektleder)': 1550
        },
        monthlyBudget: 200,
        totalBudget: null,
        organizationName: 'Røde Kors',
        categories: ['Utvikling', 'Forvaltning', 'Møter'] // DEFAULT: Legacy categories
      }
  }
}

const TimesheetTracker = ({ user, isReadOnly, organizationId }: TimesheetTrackerProps) => {
  // State for organization config - start with default, then override if it's a database project
  const [orgConfig, setOrgConfig] = useState<OrganizationConfig>(() => 
    getConsultantsAndPricesForOrganization(organizationId)
  );

  const { consultants, projectManager, monthlyBudget, totalBudget, organizationName, categories } = orgConfig;

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectLoading, setProjectLoading] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([new Date().toISOString().slice(0, 7)]);
  const [viewMode, setViewMode] = useState<'single' | 'multiple'>('single');

  // Use user for logging or tracking
  useEffect(() => {
    console.log('TimesheetTracker loaded for user:', user?.email);
  }, [user]);
  
  const [newEntry, setNewEntry] = useState<NewEntry>({
    consultant: '',
    date: new Date().toISOString().slice(0, 10),
    hours: '',
    description: '',
    category: '' // NEW: Category for new entry
  });

  // Load project data and potentially override organization config for database projects
  useEffect(() => {
    const loadProjectData = async () => {
      if (!organizationId) return;
      
      try {
        setProjectLoading(true);
        
        // For legacy prosjekter, bruk eksisterende getConsultantsAndPricesForOrganization
        const legacyIds = ['redcross', 'advokatforeningen', 'infunnel'];
        
        if (legacyIds.includes(organizationId)) {
          // Legacy prosjekter - configuration is already set correctly
          console.log('Using legacy organization config for:', organizationId);
        } else {
          // Database prosjekter - last fra database og override config
          try {
            const projects: Project[] = await projectService.getAll();
            const project: Project | undefined = projects.find((p: Project) => p.id === organizationId);
            
            if (project && project.consultants && project.consultants.length > 0) {
              console.log('Loading consultants for project:', project.name, project.consultants);
              
              // Use individual consultant rates or fall back to standard rate
              const projectConsultants: Record<string, number> = {};
              project.consultants.forEach((consultant: string) => {
                // Use individual rate if available, otherwise use standard hourly rate
                projectConsultants[consultant] = project.consultantRates?.[consultant] || project.hourlyRate;
              });

              // Override organization config with project data
              setOrgConfig({
                consultants: projectConsultants,
                projectManager: {
                  [project.projectManagerName || 'Prosjektleder']: project.projectManagerRate
                },
                monthlyBudget: project.monthlyBudgetHours,
                totalBudget: project.budgetHours,
                organizationName: project.name,
                categories: project.categories || [] // NEW: Load categories from project
              });
            }
          } catch (projectError) {
            console.error('Error loading project from database:', projectError);
            // Keep using legacy config as fallback
          }
        }
      } catch (error) {
        console.error('Error loading project data:', error);
      } finally {
        setProjectLoading(false);
      }
    };

    loadProjectData();
  }, [organizationId]);

  const loadTimeEntries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await timeEntryService.getAll(organizationId);
      
      // Konverter fra database format til component format
      const convertedEntries: TimeEntry[] = data.map(entry => ({
        id: entry.id,
        consultant: entry.consultant,
        date: entry.date,
        hours: entry.hours,
        description: entry.description || '',
        cost: entry.cost,
        isProjectManager: entry.is_project_manager,
        category: entry.category || undefined // NEW: Load category
      }));
        
      setTimeEntries(convertedEntries);
    } catch (error) {
      console.error('Error loading time entries:', error);
      // Fallback til localStorage hvis Supabase feiler
      const savedData = localStorage.getItem('pointTakenTimeEntries');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setTimeEntries(parsedData);
        } catch (parseError) {
          console.error('Error parsing saved data:', parseError);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Last inn data fra Supabase ved oppstart
  useEffect(() => {
    loadTimeEntries();
  }, [loadTimeEntries]);

  // Update date field when month selection changes
  useEffect(() => {
    if (viewMode === 'single' && selectedMonths[0]) {
      const selectedMonth = selectedMonths[0];
      const currentDate = newEntry.date;
      const currentMonth = currentDate.slice(0, 7);
      
      // If the current date doesn't match the selected month, update it
      if (currentMonth !== selectedMonth) {
        setNewEntry(prev => ({
          ...prev,
          date: `${selectedMonth}-01`
        }));
      }
    }
  }, [selectedMonths, viewMode, newEntry.date]);

  const addEntry = async () => {
    if (newEntry.consultant && newEntry.hours && newEntry.category) { // NEW: Require category
      try {
        const allRoles = { ...consultants, ...projectManager };
        const hourlyRate = allRoles[newEntry.consultant as keyof typeof allRoles] || 0;
        
        const entryData = {
          consultant: newEntry.consultant,
          date: newEntry.date,
          hours: parseFloat(newEntry.hours),
          description: newEntry.description,
          cost: parseFloat(newEntry.hours) * hourlyRate,
          is_project_manager: newEntry.consultant in projectManager,
          organization_id: organizationId,
          category: newEntry.category // NEW: Save category
        };

        // Lagre til Supabase
        const savedEntry = await timeEntryService.create(entryData);
        
        // Konverter og legg til i local state
        const newTimeEntry: TimeEntry = {
          id: savedEntry.id,
          consultant: savedEntry.consultant,
          date: savedEntry.date,
          hours: savedEntry.hours,
          description: savedEntry.description || '',
          cost: savedEntry.cost,
          isProjectManager: savedEntry.is_project_manager,
          category: savedEntry.category || undefined // NEW: Load category
        };

        setTimeEntries([...timeEntries, newTimeEntry]);
        
        // Reset form
        const currentSelectedMonth = selectedMonths[0];
        const resetDate = viewMode === 'single' && currentSelectedMonth 
          ? `${currentSelectedMonth}-01` 
          : new Date().toISOString().slice(0, 10);
        
        setNewEntry({
          consultant: '',
          date: resetDate,
          hours: '',
          description: '',
          category: '' // NEW: Reset category
        });

        // Switch month if needed
        if (viewMode === 'single') {
          const entryMonth = newTimeEntry.date.slice(0, 7);
          if (entryMonth !== selectedMonths[0]) {
            setSelectedMonths([entryMonth]);
          }
        }
      } catch (error) {
        console.error('Error saving entry:', error);
        alert('Feil ved lagring av timeregistrering. Prøv igjen.');
      }
    }
  };

  const deleteEntry = async (id: number) => {
    if (window.confirm('Er du sikker på at du vil slette denne registreringen?')) {
      try {
        await timeEntryService.delete(id);
        setTimeEntries(timeEntries.filter(entry => entry.id !== id));
      } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Feil ved sletting av timeregistrering. Prøv igjen.');
      }
    }
  };

  // NEW: Calculate category statistics
  const getCategoryStats = (): CategoryStat[] => {
    const filteredEntries = getFilteredEntries();
    const categoryTotals: Record<string, { hours: number; cost: number }> = {};
    let totalHours = 0;
    
    filteredEntries.forEach(entry => {
      if (entry.category) {
        if (!categoryTotals[entry.category]) {
          categoryTotals[entry.category] = { hours: 0, cost: 0 };
        }
        categoryTotals[entry.category].hours += entry.hours;
        categoryTotals[entry.category].cost += entry.cost;
        totalHours += entry.hours;
      }
    });
    
    return Object.entries(categoryTotals).map(([name, data]) => ({
      name,
      hours: data.hours,
      cost: data.cost,
      percentage: totalHours > 0 ? (data.hours / totalHours) * 100 : 0
    })).sort((a, b) => b.hours - a.hours);
  };

  // Filter entries based on selected months
  const getFilteredEntries = () => {
    if (viewMode === 'single') {
      const selectedMonth = selectedMonths[0];
      return timeEntries.filter(entry => entry.date.startsWith(selectedMonth));
    } else {
      return timeEntries.filter(entry => 
        selectedMonths.some(month => entry.date.startsWith(month))
      );
    }
  };

  // Calculate consultant statistics
  const getConsultantStats = (): ConsultantStat[] => {
    const filteredEntries = getFilteredEntries().filter(entry => !entry.isProjectManager);
    const consultantTotals: Record<string, { hours: number; cost: number }> = {};
    let totalHours = 0;
    
    filteredEntries.forEach(entry => {
      if (!consultantTotals[entry.consultant]) {
        consultantTotals[entry.consultant] = { hours: 0, cost: 0 };
      }
      consultantTotals[entry.consultant].hours += entry.hours;
      consultantTotals[entry.consultant].cost += entry.cost;
      totalHours += entry.hours;
    });
    
    return Object.entries(consultantTotals).map(([name, data]) => ({
      name,
      hours: data.hours,
      cost: data.cost,
      percentage: totalHours > 0 ? (data.hours / totalHours) * 100 : 0
    })).sort((a, b) => b.hours - a.hours);
  };

  // Calculate project manager statistics
  const getProjectManagerStats = (): ProjectManagerStat[] => {
    const filteredEntries = getFilteredEntries().filter(entry => entry.isProjectManager);
    const pmTotals: Record<string, { hours: number; cost: number }> = {};
    
    filteredEntries.forEach(entry => {
      if (!pmTotals[entry.consultant]) {
        pmTotals[entry.consultant] = { hours: 0, cost: 0 };
      }
      pmTotals[entry.consultant].hours += entry.hours;
      pmTotals[entry.consultant].cost += entry.cost;
    });
    
    return Object.entries(pmTotals).map(([name, data]) => ({
      name,
      hours: data.hours,
      cost: data.cost
    })).sort((a, b) => b.hours - a.hours);
  };

  // Calculate monthly history
  const getMonthlyHistory = (): MonthlyHistoryItem[] => {
    const monthlyTotals: Record<string, { hours: number; cost: number; entries: number }> = {};
    
    timeEntries.forEach(entry => {
      const month = entry.date.slice(0, 7);
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = { hours: 0, cost: 0, entries: 0 };
      }
      monthlyTotals[month].hours += entry.hours;
      monthlyTotals[month].cost += entry.cost;
      monthlyTotals[month].entries += 1;
    });
    
    return Object.entries(monthlyTotals)
      .map(([month, data]) => ({
        month,
        ...data
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  };

  // Export to Excel
  const exportToExcel = () => {
    const filteredEntries = getFilteredEntries();
    const consultantStats = getConsultantStats();
    const projectManagerStats = getProjectManagerStats();
    const categoryStats = getCategoryStats(); // NEW: Category stats for export
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header
    csvContent += "Timesheet Export for " + organizationName + "\\n";
    csvContent += "Period: " + selectedMonths.join(", ") + "\\n\\n";
    
    // NEW: Category Summary
    if (categoryStats.length > 0) {
      csvContent += "CATEGORY SUMMARY\\n";
      csvContent += "Category,Hours,Cost (NOK),Percentage\\n";
      categoryStats.forEach(stat => {
        csvContent += `"${stat.name}",${stat.hours},${stat.cost.toLocaleString('no-NO')},${stat.percentage.toFixed(1)}%\\n`;
      });
      csvContent += "\\n";
    }
    
    // Consultant Summary
    if (consultantStats.length > 0) {
      csvContent += "CONSULTANT SUMMARY\\n";
      csvContent += "Consultant,Hours,Cost (NOK),Percentage\\n";
      consultantStats.forEach(stat => {
        csvContent += `"${stat.name}",${stat.hours},${stat.cost.toLocaleString('no-NO')},${stat.percentage.toFixed(1)}%\\n`;
      });
      csvContent += "\\n";
    }
    
    // Project Manager Summary
    if (projectManagerStats.length > 0) {
      csvContent += "PROJECT MANAGEMENT\\n";
      csvContent += "Project Manager,Hours,Cost (NOK)\\n";
      projectManagerStats.forEach(stat => {
        csvContent += `"${stat.name}",${stat.hours},${stat.cost.toLocaleString('no-NO')}\\n`;
      });
      csvContent += "\\n";
    }
    
    // Detailed entries
    csvContent += "DETAILED TIME ENTRIES\\n";
    csvContent += "Date,Consultant,Hours,Category,Description,Cost (NOK)\\n"; // NEW: Added Category column
    
    filteredEntries
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(entry => {
        csvContent += `${entry.date},"${entry.consultant}",${entry.hours},"${entry.category || 'N/A'}","${entry.description}",${entry.cost.toLocaleString('no-NO')}\\n`;      });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timesheet_${organizationName}_${selectedMonths.join('_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get available months for selection - FORBEDRET VERSION
  const getAvailableMonths = () => {
    const months = new Set<string>();
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Alltid inkluder gjeldende måned først
    months.add(currentMonth);
    
    // Legg til måneder fra eksisterende timeregistreringer
    timeEntries.forEach(entry => {
      months.add(entry.date.slice(0, 7));
    });
    
    return Array.from(months).sort().reverse();
  };

  // FJERNET: Den problematiske useEffect-blokken
  // Gjeldende måned er allerede satt i initial state

  // Calculate totals
  const filteredEntries = getFilteredEntries();
  const consultantStats = getConsultantStats();
  const projectManagerStats = getProjectManagerStats();
  const categoryStats = getCategoryStats(); // NEW: Category statistics
  const monthlyHistory = getMonthlyHistory();
  
  const totalConsultantHours = consultantStats.reduce((sum, stat) => sum + stat.hours, 0);
  const totalConsultantCost = consultantStats.reduce((sum, stat) => sum + stat.cost, 0);
  const totalPMHours = projectManagerStats.reduce((sum, stat) => sum + stat.hours, 0);
  const totalPMCost = projectManagerStats.reduce((sum, stat) => sum + stat.cost, 0);
  const totalHours = totalConsultantHours + totalPMHours;
  const totalCost = totalConsultantCost + totalPMCost;

  // Add loading state to the response
  if (loading || projectLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Laster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{organizationName}</h1>
              <p className="text-gray-500 mt-1">Timeregistrering</p>
            </div>
            {!isReadOnly && (
              <div className="mt-4 sm:mt-0">
                <button
                  onClick={exportToExcel}
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                >
                  <Download size={16} className="mr-2" />
                  Eksporter til Excel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Month Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Velg tidsperiode</h2>
            <div className="flex space-x-2 mt-2 sm:mt-0">
              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  viewMode === 'single'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Enkeltmåned
              </button>
              <button
                onClick={() => setViewMode('multiple')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  viewMode === 'multiple'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Flere måneder
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {viewMode === 'single' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Velg måned
                </label>
                <select
                  value={selectedMonths[0] || new Date().toISOString().slice(0, 7)} // FALLBACK til gjeldende måned
                  onChange={(e) => setSelectedMonths([e.target.value])}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                >
                  {getAvailableMonths().map(month => (
                    <option key={month} value={month}>
                      {new Date(month + '-01').toLocaleDateString('no-NO', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Velg måneder (hold Ctrl/Cmd for flere)
                </label>
                <select
                  multiple
                  value={selectedMonths}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedMonths(values);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400 min-h-24"
                >
                  {getAvailableMonths().map(month => (
                    <option key={month} value={month}>
                      {new Date(month + '-01').toLocaleDateString('no-NO', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Add Time Entry */}
        {!isReadOnly && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Ny timeregistrering</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konsulent
                </label>
                <select
                  value={newEntry.consultant}
                  onChange={(e) => setNewEntry({...newEntry, consultant: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                >
                  <option value="">Velg konsulent</option>
                  {Object.keys(consultants).map(name => (
                    <option key={name} value={name}>
                      {name} ({consultants[name]} kr/t)
                    </option>
                  ))}
                  {Object.keys(projectManager).map(name => (
                    <option key={name} value={name}>
                      {name} ({projectManager[name]} kr/t)
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dato
                </label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timer
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={newEntry.hours}
                  onChange={(e) => setNewEntry({...newEntry, hours: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="f.eks. 7.5"
                />
              </div>
              
              {/* NEW: Category selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  value={newEntry.category}
                  onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                >
                  <option value="">Velg kategori</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beskrivelse
                </label>
                <input
                  type="text"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Beskriv arbeidet som ble utført..."
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={addEntry}
                disabled={!newEntry.consultant || !newEntry.hours || !newEntry.category}
                className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Plus size={16} className="mr-2" />
                Legg til
              </button>
            </div>
          </div>
        )}

        {/* NEW: Category Statistics */}
        {categoryStats.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Kategorier</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kostnad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Andel
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categoryStats.map((stat, index) => (
                    <tr key={stat.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stat.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.hours}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.cost.toLocaleString('no-NO')} kr
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${stat.percentage}%` }}
                            ></div>
                          </div>
                          <span>{stat.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Consultant Statistics - existing code unchanged */}
        {consultantStats.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Konsulent timer</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Konsulent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kostnad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Andel
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {consultantStats.map((stat, index) => (
                    <tr key={stat.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stat.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.hours}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.cost.toLocaleString('no-NO')} kr
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${stat.percentage}%` }}
                            ></div>
                          </div>
                          <span>{stat.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Prosjektleder statistikk */}
        {projectManagerStats.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Prosjektledelse</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prosjektleder
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kostnad
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projectManagerStats.map((stat, index) => (
                    <tr key={stat.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stat.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.hours}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.cost.toLocaleString('no-NO')} kr
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Konsulent timer</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-2xl font-light text-gray-900">{totalConsultantHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Kostnad</span>
                <span className="text-sm font-medium text-gray-900">{totalConsultantCost.toLocaleString('no-NO')} kr</span>
              </div>
              {monthlyBudget && viewMode === 'single' && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Av budsjett</span>
                  <span className="text-sm font-medium text-gray-900">
                    {((totalConsultantHours / monthlyBudget) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {totalBudget && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Av total ramme</span>
                  <span className="text-sm font-medium text-gray-900">
                    {((totalHours / totalBudget) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Prosjektledelse</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-2xl font-light text-gray-900">{totalPMHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Kostnad</span>
                <span className="text-sm font-medium text-gray-900">{totalPMCost.toLocaleString('no-NO')} kr</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Samlet total</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-2xl font-light text-gray-900">{totalHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total kostnad</span>
                <span className="text-sm font-medium text-gray-900">{totalCost.toLocaleString('no-NO')} kr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Registreringer</span>
                <span className="text-sm font-medium text-gray-900">{filteredEntries.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Time Entries Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Timeregistreringer
              {viewMode === 'single' && selectedMonths[0] && (
                <span className="text-gray-500 ml-2">
                  · {new Date(selectedMonths[0] + '-01').toLocaleDateString('no-NO', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </span>
              )}
              {viewMode === 'multiple' && selectedMonths.length > 0 && (
                <span className="text-gray-500 ml-2">· {selectedMonths.length} måneder</span>
              )}
            </h2>
          </div>
          
          {filteredEntries.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p>Ingen timeregistreringer for valgt periode</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Konsulent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beskrivelse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kostnad
                    </th>
                    {!isReadOnly && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEntries
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.consultant}
                        </div>
                        <div className="text-xs text-gray-500">
                          {entry.isProjectManager && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 mr-2">
                              Prosjektleder
                            </span>
                          )}
                          {/* Show individual rate if available */}
                          {(() => {
                            const allRoles = { ...consultants, ...projectManager };
                            const rate = allRoles[entry.consultant as keyof typeof allRoles];
                            return rate ? `${rate} kr/t` : '';
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.date).toLocaleDateString('no-NO', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.hours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.category && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-800">
                            {entry.category}
                          </span>
                        )}
                        {!entry.category && (
                          <span className="text-gray-400 text-xs">Ingen kategori</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate" title={entry.description}>
                          {entry.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.cost.toLocaleString('no-NO')} kr
                      </td>
                      {!isReadOnly && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Slett registrering"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Monthly History for Multiple View */}
        {viewMode === 'multiple' && monthlyHistory.length > 1 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Månedlig oversikt</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {monthlyHistory.map((item) => {
                const isSelected = selectedMonths.includes(item.month);
                return (
                  <div
                    key={item.month}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-gray-900 bg-gray-900 text-white' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMonths(selectedMonths.filter(m => m !== item.month));
                      } else {
                        setSelectedMonths([...selectedMonths, item.month]);
                      }
                    }}
                  >
                    <p className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(item.month + '-01').toLocaleDateString('no-NO', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </p>
                    <p className={`text-xs mt-1 ${isSelected ? 'text-gray-200' : 'text-gray-600'}`}>
                      {item.hours}h • {item.entries} reg.
                    </p>
                    <p className={`text-xs ${isSelected ? 'text-gray-200' : 'text-gray-600'}`}>
                      {item.cost.toLocaleString('no-NO')} kr
                    </p>
                  </div>
                );
              })}
            </div>
            {selectedMonths.length > 0 && (
              <p className="text-sm text-gray-600 mt-4">
                {selectedMonths.length} måneder valgt
              </p>
            )}
          </div>
        )}

        {/* Customer Notes */}
        <div className="mt-8">
          <CustomerNotes 
            organizationId={organizationId}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
};

export default TimesheetTracker;
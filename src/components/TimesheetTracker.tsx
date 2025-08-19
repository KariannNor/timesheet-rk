import CustomerNotes from './CustomerNotes'
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { timeEntryService } from '../lib/supabase';
import { projectService, type Project } from '../lib/projectService'; // Import Project type from projectService
import type { User } from '@supabase/supabase-js';

// Remove the local Project interface - we'll use the one from projectService instead

// Oppdater TimeEntry interface til å matche database-strukturen
interface TimeEntry {
  id: number;
  consultant: string;
  date: string;
  hours: number;
  description: string;
  cost: number;
  isProjectManager: boolean;
}

interface NewEntry {
  consultant: string;
  date: string;
  hours: string;
  description: string;
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
        organizationName: 'Infunnel/Holmen'
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
        organizationName: 'Advokatforeningen CRM'
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
        organizationName: 'Røde Kors'
      }
  }
}

const TimesheetTracker = ({ user, isReadOnly, organizationId }: TimesheetTrackerProps) => {
  // State for organization config - start with default, then override if it's a database project
  const [orgConfig, setOrgConfig] = useState<OrganizationConfig>(() => 
    getConsultantsAndPricesForOrganization(organizationId)
  );

  const { consultants, projectManager, monthlyBudget, totalBudget, organizationName } = orgConfig;

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
    description: ''
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
              
              // NEW: Use individual consultant rates or fall back to standard rate
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
                organizationName: project.name
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
        isProjectManager: entry.is_project_manager
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
    if (newEntry.consultant && newEntry.hours) {
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
          organization_id: organizationId
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
          isProjectManager: savedEntry.is_project_manager
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
          description: ''
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

  // Filtrer data basert på valgte måneder - skille konsulenter og prosjektleder
  const filteredEntries = (() => {
    if (viewMode === 'single') {
      return timeEntries.filter(entry => entry.date.startsWith(selectedMonths[0]));
    } else {
      return timeEntries.filter(entry => 
        selectedMonths.some(month => entry.date.startsWith(month))
      );
    }
  })();
  
  // Separer konsulent og prosjektleder data
  const consultantEntries = filteredEntries.filter(entry => !entry.isProjectManager);
  const projectManagerEntries = filteredEntries.filter(entry => entry.isProjectManager);
  
  // Beregn totaler for konsulenter (hovedbudsjett)
  const totalHours = consultantEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalCost = consultantEntries.reduce((sum, entry) => sum + entry.cost, 0);
  
  // Beregn totaler for prosjektleder (separat fakturering)
  const pmTotalHours = projectManagerEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const pmTotalCost = projectManagerEntries.reduce((sum, entry) => sum + entry.cost, 0);
  
  // Samlet total
  const grandTotalHours = totalHours + pmTotalHours;
  const grandTotalCost = totalCost + pmTotalCost;
  
  const budgetWarningThreshold = monthlyBudget ? monthlyBudget * 0.85 : null
  const avgHoursPerMonth = viewMode === 'multiple' && selectedMonths.length > 0 
    ? totalHours / selectedMonths.length 
    : totalHours

  // Beregn total timer brukt (alle måneder)
  const allConsultantEntries = timeEntries.filter(entry => !entry.isProjectManager);
  const allProjectManagerEntries = timeEntries.filter(entry => entry.isProjectManager);

  // For Røde Kors: kun konsulent timer teller mot budsjett
  // For andre: både konsulent og prosjektleder timer teller mot budsjett
  const totalHoursUsed = organizationId === 'redcross' 
    ? allConsultantEntries.reduce((sum, entry) => sum + entry.hours, 0)
    : allConsultantEntries.reduce((sum, entry) => sum + entry.hours, 0) + allProjectManagerEntries.reduce((sum, entry) => sum + entry.hours, 0);

  // Check budget warnings
  const isApproachingMonthlyBudget = monthlyBudget && avgHoursPerMonth >= (budgetWarningThreshold || 0);
  const totalBudgetPercentage = totalBudget ? (totalHoursUsed / totalBudget) * 100 : null;
  const isApproachingTotalBudget = totalBudgetPercentage !== null && totalBudgetPercentage >= 85;

  // Konsulent statistikk (kun konsulenter, ikke prosjektleder)
  const consultantStats: ConsultantStat[] = Object.keys(consultants).map(name => {
    const entries = consultantEntries.filter(entry => entry.consultant === name);
    const hours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const cost = entries.reduce((sum, entry) => sum + entry.cost, 0);
    const percentage = totalHours > 0 ? (hours / totalHours * 100) : 0;
    return { name, hours, cost, percentage };
  }).filter(stat => stat.hours > 0);

  // Prosjektleder statistikk
  const pmStats: ProjectManagerStat[] = Object.keys(projectManager).map(name => {
    const entries = projectManagerEntries.filter(entry => entry.consultant === name);
    const hours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const cost = entries.reduce((sum, entry) => sum + entry.cost, 0);
    return { name, hours, cost };
  }).filter(stat => stat.hours > 0);

  // Månedlig historikk
  const getMonthlyHistory = (): MonthlyHistoryItem[] => {
    const months = [...new Set(timeEntries.map(entry => entry.date.slice(0, 7)))].sort().reverse();
    return months.map(month => {
      const monthEntries = timeEntries.filter(entry => entry.date.startsWith(month));
      const hours = monthEntries.reduce((sum, entry) => sum + entry.hours, 0);
      const cost = monthEntries.reduce((sum, entry) => sum + entry.cost, 0);
      return { month, hours, cost, entries: monthEntries.length };
    });
  };

  const monthlyHistory = getMonthlyHistory();

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' });
  };

  const getMonthName = (monthStr: string): string => {
    const months = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 
                   'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
    const [year, month] = monthStr.split('-');
    const monthIndex = parseInt(month) - 1;
    if (monthIndex < 0 || monthIndex >= months.length) {
      return monthStr;
    }
    return `${months[monthIndex]} ${year}`;
  };

  const toggleMonthSelection = (month: string) => {
    if (viewMode === 'single') {
      setSelectedMonths([month]);
    } else {
      setSelectedMonths(prev => 
        prev.includes(month) 
          ? prev.filter(m => m !== month)
          : [...prev, month].sort()
      );
    }
  };

  const exportToExcel = () => {
    if (filteredEntries.length === 0) {
      alert('Ingen data å eksportere');
      return;
    }

    try {
      // Opprett Excel-kompatibel data
      const worksheetData: (string | number)[][] = [];
      
      // Header for sammendrag
      worksheetData.push([`POINT TAKEN - ${organizationName.toUpperCase()} TIMESOVERSIKT`]);
      worksheetData.push(['Periode:', viewMode === 'single' && selectedMonths[0] 
        ? getMonthName(selectedMonths[0]) 
        : `${selectedMonths.length} måneder`]);
      worksheetData.push(['Generert:', new Date().toLocaleDateString('no-NO')]);
      worksheetData.push([]);
      
      // Sammendrag
      worksheetData.push(['SAMMENDRAG']);
      worksheetData.push(['Konsulent timer:', totalHours]);
      worksheetData.push(['Konsulent kostnad:', `${totalCost.toLocaleString('no-NO')} NOK`]);
      worksheetData.push(['Prosjektleder timer:', pmTotalHours]);
      worksheetData.push(['Prosjektleder kostnad:', `${pmTotalCost.toLocaleString('no-NO')} NOK`]);
      worksheetData.push(['TOTAL KOSTNAD:', `${grandTotalCost.toLocaleString('no-NO')} NOK`]);

      if (monthlyBudget) {
        if (viewMode === 'multiple') {
          worksheetData.push(['Gjennomsnitt konsulenter per måned:', `${avgHoursPerMonth.toFixed(1)} timer`]);
        }
        worksheetData.push(['Månedsbudsjett forbruk:', `${((avgHoursPerMonth / monthlyBudget) * 100).toFixed(1)}%`]);
      }

      if (totalBudget && totalBudgetPercentage !== null) {
        const budgetDescription = organizationId === 'redcross' 
          ? `${totalBudgetPercentage.toFixed(1)}% (${totalHoursUsed}/${totalBudget} timer - kun konsulenter)`
          : `${totalBudgetPercentage.toFixed(1)}% (${totalHoursUsed}/${totalBudget} timer - inkl. prosjektleder)`;
        worksheetData.push(['Total ramme brukt:', budgetDescription]);
      }
      worksheetData.push([]);
      
      // Konsulent fordeling med timepriser
      if (consultantStats.length > 0) {
        worksheetData.push(['KONSULENT FORDELING']);
        worksheetData.push(['Konsulent', 'Timer', 'Prosent', 'Timepris (NOK)', 'Kostnad (NOK)']);
        consultantStats.forEach(stat => {
          const hourlyRate = consultants[stat.name] || 0;
          worksheetData.push([
            stat.name, 
            stat.hours, 
            `${stat.percentage.toFixed(1)}%`, 
            hourlyRate.toLocaleString('no-NO'),
            stat.cost.toLocaleString('no-NO')
          ]);
        });
        worksheetData.push([]);
      }
      
      // Prosjektleder fordeling
      if (pmStats.length > 0) {
        worksheetData.push(['PROSJEKTLEDELSE']);
        worksheetData.push(['Navn', 'Timer', 'Timepris (NOK)', 'Kostnad (NOK)']);
        pmStats.forEach(stat => {
          const hourlyRate = projectManager[stat.name] || 0;
          worksheetData.push([
            stat.name, 
            stat.hours, 
            hourlyRate.toLocaleString('no-NO'),
            stat.cost.toLocaleString('no-NO')
          ]);
        });
        worksheetData.push([]);
      }
      
      // Detaljerte registreringer
      worksheetData.push(['DETALJERTE TIMEREGISTRERINGER']);
      worksheetData.push(['Konsulent', 'Dato', 'Timer', 'Timepris (NOK)', 'DevOps oppgaver denne perioden', 'Kostnad (NOK)']);
      filteredEntries.forEach(entry => {
        const hourlyRate = (consultants[entry.consultant] || projectManager[entry.consultant]) || 0;
        worksheetData.push([
          entry.consultant,
          entry.date,
          entry.hours,
          hourlyRate.toLocaleString('no-NO'),
          entry.description,
          entry.cost.toLocaleString('no-NO')
        ]);
      });

      // Konverter til CSV format
      const csvContent = worksheetData.map(row => 
        row.map(cell => typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell).join(',')
      ).join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const fileName = viewMode === 'single' 
        ? `Point_Taken_Timesoversikt_${selectedMonths[0]}.csv`
        : `Point_Taken_Timesoversikt_${selectedMonths.length}_maneder.csv`;
      
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Feil ved eksportering av data');
    }
  };

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
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Timesoversikt</h1>
          <p className="text-gray-600">
            {organizationName}
            {organizationId === 'redcross' && ' - Forvaltningsavtale'}
          </p>
          {isReadOnly && (
            <p className="text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 mt-2">
              Du har kun lesetilgang til denne oversikten
            </p>
          )}
        </div>

        {/* Budget Warning Alert */}
        {(isApproachingMonthlyBudget || isApproachingTotalBudget) && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Nærmer seg budsjettgrense
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  {isApproachingMonthlyBudget && monthlyBudget && (
                    <p>
                      Du har registrert <strong>{avgHoursPerMonth.toFixed(1)} timer</strong> av {monthlyBudget} tillatte timer {viewMode === 'multiple' ? 'per måned i snitt' : 'denne måneden'}.
                      {avgHoursPerMonth >= monthlyBudget ? (
                        <span className="block mt-1 font-medium text-red-700">Månedsbudsjettet er overskredet!</span>
                      ) : (
                        <span className="block mt-1">Bare {(monthlyBudget - avgHoursPerMonth).toFixed(1)} timer igjen til månedsgrensen.</span>
                      )}
                    </p>
                  )}
                  {isApproachingTotalBudget && totalBudget && totalBudgetPercentage !== null && (
                    <p className={isApproachingMonthlyBudget ? "mt-2" : ""}>
                      <strong>{totalHoursUsed} timer</strong> av {totalBudget} tilgjengelige timer brukt totalt ({totalBudgetPercentage.toFixed(1)}%).
                      {organizationId !== 'redcross' && (
                        <span className="text-xs block">Inkluderer både konsulent og prosjektleder timer.</span>
                      )}
                      {totalBudgetPercentage >= 100 ? (
                        <span className="block mt-1 font-medium text-red-700">Total timeramme er overskredet!</span>
                      ) : (
                        <span className="block mt-1">Bare {(totalBudget - totalHoursUsed)} timer igjen av total ramme.</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Visning og eksport */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Visning</label>
              <select
                value={viewMode}
                onChange={(e) => {
                  const mode = e.target.value as 'single' | 'multiple';
                  setViewMode(mode);
                  if (mode === 'single') {
                    setSelectedMonths([selectedMonths[0] || new Date().toISOString().slice(0, 7)]);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              >
                <option value="single">Enkelt måned</option>
                <option value="multiple">Flere måneder</option>
              </select>
            </div>
            
            {viewMode === 'single' && selectedMonths[0] && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">Måned</label>
                <input
                  type="month"
                  value={selectedMonths[0]}
                  onChange={(e) => setSelectedMonths([e.target.value])}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            )}
          </div>
          
          <button
            onClick={exportToExcel}
            disabled={filteredEntries.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <span>Eksporter Excel</span>
          </button>
        </div>

        {/* Månedlig historikk for flervalg */}
        {viewMode === 'multiple' && monthlyHistory.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Velg måneder</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {monthlyHistory.map(({ month, hours, cost, entries }) => (
                <div
                  key={month}
                  onClick={() => toggleMonthSelection(month)}
                  className={`p-3 rounded-md border-2 cursor-pointer transition-colors ${
                    selectedMonths.includes(month) 
                      ? 'border-gray-900 bg-gray-900 text-white' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm">{getMonthName(month)}</p>
                  <p className="text-xs opacity-75">{hours}h • {entries} reg.</p>
                  <p className="text-xs opacity-75">{cost.toLocaleString('no-NO')} kr</p>
                </div>
              ))}
            </div>
            {selectedMonths.length > 0 && (
              <p className="text-sm text-gray-600 mt-3">
                {selectedMonths.length} måneder valgt
              </p>
            )}
          </div>
        )}

        {/* Sammendrag kort */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Konsulent timer</p>
            <p className="text-2xl font-light text-gray-900">{totalHours}</p>
            {viewMode === 'multiple' && (
              <p className="text-xs text-gray-500">Ø {avgHoursPerMonth.toFixed(1)}h/måned</p>
            )}
          </div>
          
          {monthlyBudget && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Månedsbudsjett</p>
              <p className="text-2xl font-light text-gray-900">{((avgHoursPerMonth / monthlyBudget) * 100).toFixed(1)}%</p>
              <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                <div 
                  className={`h-1 rounded-full transition-all ${
                    avgHoursPerMonth >= monthlyBudget ? 'bg-red-500' : 'bg-gray-900'
                  }`}
                  style={{ width: `${Math.min((avgHoursPerMonth / monthlyBudget) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {totalBudget && totalBudgetPercentage !== null && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total ramme</p>
              <p className="text-2xl font-light text-gray-900">{totalBudgetPercentage.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">
                {totalHoursUsed} / {totalBudget} timer
                {organizationId === 'redcross' ? ' (kun konsulenter)' : ' (inkl. prosjektleder)'}
              </p>
              <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                <div 
                  className={`h-1 rounded-full transition-all ${
                    totalBudgetPercentage >= 100 ? 'bg-red-500' : totalBudgetPercentage >= 85 ? 'bg-yellow-500' : 'bg-gray-900'
                  }`}
                  style={{ width: `${Math.min(totalBudgetPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Konsulent kostnad</p>
            <p className="text-2xl font-light text-gray-900">{totalCost.toLocaleString('no-NO')} kr</p>
            {viewMode === 'multiple' && selectedMonths.length > 0 && (
              <p className="text-xs text-gray-500">Ø {(totalCost / selectedMonths.length).toLocaleString('no-NO')} kr/måned</p>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Prosjektleder</p>
            <p className="text-2xl font-light text-gray-900">{pmTotalHours}h</p>
            <p className="text-xs text-gray-500">{pmTotalCost.toLocaleString('no-NO')} kr</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total kostnad</p>
            <p className="text-2xl font-light text-gray-900">{grandTotalCost.toLocaleString('no-NO')} kr</p>
            <p className="text-xs text-gray-500">{grandTotalHours}h totalt</p>
          </div>
        </div>

        {/* Konsulent fordeling */}
        {consultantStats.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Konsulent fordeling</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {consultantStats.map(stat => (
                <div key={stat.name} className="p-4 bg-gray-50 rounded-md">
                  <p className="font-medium text-gray-900">{stat.name}</p>
                  <p className="text-sm text-gray-600">{stat.hours}h ({stat.percentage.toFixed(1)}%)</p>
                  <p className="text-sm text-gray-900 font-medium">{stat.cost.toLocaleString('no-NO')} kr</p>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                    <div 
                      className="bg-gray-900 h-1 rounded-full"
                      style={{ width: `${stat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prosjektleder separat */}
        {pmStats.length > 0 && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Prosjektledelse</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pmStats.map(stat => (
                <div key={stat.name} className="p-4 bg-white rounded-md border border-blue-200">
                  <p className="font-medium text-gray-900">{stat.name}</p>
                  <p className="text-sm text-gray-600">{stat.hours}h</p>
                  <p className="text-sm text-gray-900 font-medium">{stat.cost.toLocaleString('no-NO')} kr</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legg til ny registrering - Hide if read-only */}
        {!isReadOnly && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Ny timeregistrering</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Konsulent</label>
                <select
                  value={newEntry.consultant}
                  onChange={(e) => setNewEntry({...newEntry, consultant: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                >
                  <option value="">Velg konsulent</option>
                  {Object.keys(consultants).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <optgroup label="Prosjektledelse">
                    {Object.keys(projectManager).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Dato</label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Timer (månedlig total)</label>
                <input
                  type="number"
                  step="0.25"
                  value={newEntry.hours}
                  onChange={(e) => setNewEntry({...newEntry, hours: e.target.value})}
                  placeholder="160"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Kostnad</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600">
                  {newEntry.consultant && newEntry.hours ? 
                    `${(parseFloat(newEntry.hours || '0') * ((consultants[newEntry.consultant as keyof typeof consultants] || projectManager[newEntry.consultant as keyof typeof projectManager]) || 0)).toLocaleString('no-NO')} kr` : 
                    '0 kr'
                  }
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">DevOps oppgaver denne perioden</label>
              <input
                type="text"
                value={newEntry.description}
                onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                placeholder="Beskriv DevOps oppgavene som ble utført denne måneden"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            
            <button
              onClick={addEntry}
              disabled={!newEntry.consultant || !newEntry.hours}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              <span>Legg til registrering</span>
            </button>
          </div>
        )}

        {/* Timeregistreringer tabell */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Timeregistreringer {viewMode === 'single' && selectedMonths[0] 
                ? `· ${getMonthName(selectedMonths[0])}` 
                : `· ${selectedMonths.length} måneder`}
            </h2>
          </div>
          
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Ingen timeregistreringer for valgt periode
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
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
                      DevOps oppgaver denne perioden
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
                    .map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.consultant}
                          {entry.isProjectManager && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                              Prosjektledelse
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(consultants[entry.consultant as keyof typeof consultants] || projectManager[entry.consultant as keyof typeof projectManager])} kr/t
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.hours}h
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate">{entry.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.cost.toLocaleString('no-NO')} kr
                      </td>
                      {!isReadOnly && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
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

        {/* Footer sammendrag */}
        {filteredEntries.length > 0 && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Konsulent timer / Forvaltningsavtale */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-200 pb-2">
                {organizationId === 'redcross' ? (
                  monthlyBudget ? `Forvaltningsavtale (${monthlyBudget} timer/måned)` : 'Forvaltningsavtale'
                ) : (
                  totalBudget ? `Konsulent timer (${totalBudget} timer totalt)` : 'Konsulent timer'
                )}
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Konsulent timer</p>
                  <p className="text-xl font-light text-gray-900">{totalHours}h</p>
                  {viewMode === 'multiple' && (
                    <p className="text-xs text-gray-500">Ø {avgHoursPerMonth.toFixed(1)}h/måned</p>
                  )}
                </div>
                {monthlyBudget && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Månedsbudsjett</p>
                    <p className="text-xl font-light text-gray-900">{((avgHoursPerMonth / monthlyBudget) * 100).toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">av {monthlyBudget}t budsjett</p>
                  </div>
                )}
                {totalBudget && totalBudgetPercentage !== null && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total ramme brukt</p>
                    <p className="text-xl font-light text-gray-900">{totalBudgetPercentage.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">
                      {totalHoursUsed} / {totalBudget} timer
                      {organizationId === 'redcross' ? ' (kun konsulenter)' : ' (inkl. prosjektleder)'}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-600 mb-1">Konsulent kostnad</p>
                  <p className="text-xl font-light text-gray-900">{totalCost.toLocaleString('no-NO')} kr</p>
                  {viewMode === 'multiple' && selectedMonths.length > 0 && (
                    <p className="text-xs text-gray-500">Ø {(totalCost / selectedMonths.length).toLocaleString('no-NO')} kr/måned</p>
                  )}
                </div>
              </div>
            </div>

            {/* Separat fakturering (prosjektleder) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide border-b border-blue-200 pb-2">
                Prosjektledelse
              </h3>
              {pmTotalHours > 0 ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Prosjektleder timer</p>
                    <p className="text-xl font-light text-gray-900">{pmTotalHours}h</p>
                    {viewMode === 'multiple' && selectedMonths.length > 0 && (
                      <p className="text-xs text-gray-500">Ø {(pmTotalHours / selectedMonths.length).toFixed(1)}h/måned</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Timepris</p>
                    <p className="text-xl font-light text-gray-900">
                      {Object.values(projectManager)[0]?.toLocaleString('no-NO') || '1550'} kr
                    </p>
                    <p className="text-xs text-gray-500">per time</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Prosjektleder kostnad</p>
                    <p className="text-xl font-light text-gray-900">{pmTotalCost.toLocaleString('no-NO')} kr</p>
                    {viewMode === 'multiple' && selectedMonths.length > 0 && (
                      <p className="text-xs text-gray-500">Ø {(pmTotalCost / selectedMonths.length).toLocaleString('no-NO')} kr/måned</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">Ingen prosjektleder timer registrert</p>
                </div>
              )}
            </div>

            {/* Samlet total */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-300 pb-2">
                Samlet total
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Timer totalt</p>
                  <p className="text-xl font-light text-gray-900">{grandTotalHours}h</p>
                  <p className="text-xs text-gray-500">{filteredEntries.length} registreringer</p>
                </div>
                <div>
                  <p className="text-xl font-light text-gray-900">{grandTotalCost.toLocaleString('no-NO')} kr</p>
                  <p className="text-xs text-gray-500">
                    {viewMode === 'single' && selectedMonths[0] 
                      ? getMonthName(selectedMonths[0]) 
                      : `${selectedMonths.length} måneder`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Divider / Skillelinje */}
        <div className="border-t border-gray-300 my-8"></div>

        {/* Customer Notes Section */}
        <CustomerNotes 
          organizationId={organizationId}
          isReadOnly={isReadOnly}
        />
      </div>
    </div>
  );
}

export default TimesheetTracker;
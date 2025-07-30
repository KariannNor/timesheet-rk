import { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Calendar, TrendingUp } from 'lucide-react';

// Define interfaces for type safety
interface TimeEntry {
  id: number;
  consultant: string;
  date: string;
  hours: number;
  devOpsTask: string;
  description: string;
  cost: number;
  isProjectManager: boolean;
}

interface NewEntry {
  consultant: string;
  date: string;
  hours: string;
  devOpsTask: string;
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

const TimesheetTracker = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([new Date().toISOString().slice(0, 7)]);
  const [viewMode, setViewMode] = useState<'single' | 'multiple'>('single');
  
  // Point Taken konsulenter med timepriser fra avtalen
  const consultants: Record<string, number> = {
    'Njål': 1550,
    'Mathias': 1550,
    'Per': 1550,
    'Pepe': 1550,
    'Ulrikke': 1550,
    'Andri': 1550,
    'Philip': 1550,
    'Nick': 1550,
    'MVP/Rådgiver': 1550
  };

  // Prosjektleder faktureres separat
  const projectManager: Record<string, number> = {
    'Kariann (Prosjektleder)': 1550
  };

  const [newEntry, setNewEntry] = useState<NewEntry>({
    consultant: '',
    date: new Date().toISOString().slice(0, 10),
    hours: '',
    devOpsTask: '',
    description: ''
  });

  // Last inn data fra localStorage ved oppstart
  useEffect(() => {
    const savedData = localStorage.getItem('pointTakenTimeEntries');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setTimeEntries(parsedData);
      } catch (error) {
        console.error('Error parsing saved data:', error);
      }
    }
  }, []);

  // Lagre data til localStorage når timeEntries endres
  useEffect(() => {
    try {
      localStorage.setItem('pointTakenTimeEntries', JSON.stringify(timeEntries));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [timeEntries]);

  const addEntry = () => {
    if (newEntry.consultant && newEntry.hours) {
      const allRoles = { ...consultants, ...projectManager };
      const entry: TimeEntry = {
        id: Date.now(),
        ...newEntry,
        hours: parseFloat(newEntry.hours),
        cost: parseFloat(newEntry.hours) * allRoles[newEntry.consultant],
        isProjectManager: newEntry.consultant in projectManager
      };
      setTimeEntries([...timeEntries, entry]);
      
      // Reset form but keep the date in the selected month
      const currentSelectedMonth = selectedMonths[0];
      const resetDate = viewMode === 'single' && currentSelectedMonth 
        ? `${currentSelectedMonth}-01` 
        : new Date().toISOString().slice(0, 10);
      
      setNewEntry({
        consultant: '',
        date: resetDate,
        hours: '',
        devOpsTask: '',
        description: ''
      });

      // If in single mode and the new entry's month doesn't match selected month,
      // automatically switch to that month
      if (viewMode === 'single') {
        const entryMonth = entry.date.slice(0, 7);
        if (entryMonth !== selectedMonths[0]) {
          setSelectedMonths([entryMonth]);
        }
      }
    }
  };

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
  }, [selectedMonths, viewMode]);

  const deleteEntry = (id: number) => {
    if (window.confirm('Er du sikker på at du vil slette denne registreringen?')) {
      setTimeEntries(timeEntries.filter(entry => entry.id !== id));
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
  
  const monthlyBudget = 200;
  const avgHoursPerMonth = viewMode === 'multiple' && selectedMonths.length > 0 
    ? totalHours / selectedMonths.length 
    : totalHours;

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
      return monthStr; // fallback to original string if parsing fails
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
      worksheetData.push(['POINT TAKEN - RØDE KORS TIMESOVERSIKT']);
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
      if (viewMode === 'multiple') {
        worksheetData.push(['Gjennomsnitt konsulenter per måned:', `${avgHoursPerMonth.toFixed(1)} timer`]);
      }
      worksheetData.push(['Budsjettforbruk konsulenter:', `${((avgHoursPerMonth / monthlyBudget) * 100).toFixed(1)}%`]);
      worksheetData.push([]);
      
      // Konsulent fordeling
      if (consultantStats.length > 0) {
        worksheetData.push(['KONSULENT FORDELING']);
        worksheetData.push(['Konsulent', 'Timer', 'Prosent', 'Kostnad (NOK)']);
        consultantStats.forEach(stat => {
          worksheetData.push([stat.name, stat.hours, `${stat.percentage.toFixed(1)}%`, stat.cost.toLocaleString('no-NO')]);
        });
        worksheetData.push([]);
      }
      
      // Prosjektleder fordeling
      if (pmStats.length > 0) {
        worksheetData.push(['PROSJEKTLEDELSE (SEPARAT FAKTURERING)']);
        worksheetData.push(['Navn', 'Timer', 'Kostnad (NOK)']);
        pmStats.forEach(stat => {
          worksheetData.push([stat.name, stat.hours, stat.cost.toLocaleString('no-NO')]);
        });
        worksheetData.push([]);
      }
      
      // Detaljerte registreringer
      worksheetData.push(['DETALJERTE TIMEREGISTRERINGER']);
      worksheetData.push(['Konsulent', 'Dato', 'Timer', 'DevOps Oppgave', 'Beskrivelse', 'Kostnad (NOK)']);
      filteredEntries.forEach(entry => {
        worksheetData.push([
          entry.consultant,
          entry.date,
          entry.hours,
          entry.devOpsTask,
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

  // Add this useEffect to update the date field when month selection changes
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
  }, [selectedMonths, viewMode]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Timesoversikt</h1>
          <p className="text-gray-600">Point Taken · Røde Kors Forvaltningsavtale</p>
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Konsulent timer</p>
            <p className="text-2xl font-light text-gray-900">{totalHours}</p>
            {viewMode === 'multiple' && (
              <p className="text-xs text-gray-500">Ø {avgHoursPerMonth.toFixed(1)}h/måned</p>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Budsjettforbruk</p>
            <p className="text-2xl font-light text-gray-900">{((avgHoursPerMonth / monthlyBudget) * 100).toFixed(1)}%</p>
            <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
              <div 
                className="bg-gray-900 h-1 rounded-full transition-all"
                style={{ width: `${Math.min((avgHoursPerMonth / monthlyBudget) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
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
            <h2 className="text-lg font-medium text-gray-900 mb-2">Prosjektledelse (separat fakturering)</h2>
            <p className="text-sm text-gray-600 mb-4">Faktureres utenom hovedavtalen</p>
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

        {/* Legg til ny registrering */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Ny timeregistrering</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
              <label className="block text-sm text-gray-600 mb-1">Timer</label>
              <input
                type="number"
                step="0.25"
                value={newEntry.hours}
                onChange={(e) => setNewEntry({...newEntry, hours: e.target.value})}
                placeholder="7.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">DevOps Oppgave</label>
              <input
                type="text"
                value={newEntry.devOpsTask}
                onChange={(e) => setNewEntry({...newEntry, devOpsTask: e.target.value})}
                placeholder="f.eks. #1234"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Kostnad</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600">
                {newEntry.consultant && newEntry.hours ? 
                  `${(parseFloat(newEntry.hours || '0') * (consultants[newEntry.consultant] || projectManager[newEntry.consultant] || 0)).toLocaleString('no-NO')} kr` : 
                  '0 kr'
                }
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Beskrivelse</label>
            <input
              type="text"
              value={newEntry.description}
              onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
              placeholder="Beskriv oppgaven som ble utført"
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
                      DevOps Oppgave
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beskrivelse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kostnad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      
                    </th>
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
                              Separat fakturering
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(consultants[entry.consultant] || projectManager[entry.consultant])} kr/t
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.hours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {entry.devOpsTask && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded font-mono">
                            {entry.devOpsTask}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate">{entry.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.cost.toLocaleString('no-NO')} kr
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
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
            {/* Forvaltningsavtale (konsulenter) */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-200 pb-2">
                Forvaltningsavtale (200 timer/måned)
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Konsulent timer</p>
                  <p className="text-xl font-light text-gray-900">{totalHours}h</p>
                  {viewMode === 'multiple' && (
                    <p className="text-xs text-gray-500">Ø {avgHoursPerMonth.toFixed(1)}h/måned</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Budsjettforbruk</p>
                  <p className="text-xl font-light text-gray-900">{((avgHoursPerMonth / monthlyBudget) * 100).toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">av 200t budsjett</p>
                </div>
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
                Separat fakturering
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
                    <p className="text-xl font-light text-gray-900">1.550 kr</p>
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
                  <p className="text-xs text-gray-600 mb-1">Kostnad totalt</p>
                  <p className="text-xl font-light text-gray-900">{grandTotalCost.toLocaleString('no-NO')} kr</p>
                  <p className="text-xs text-gray-500">
                    {viewMode === 'single' ? getMonthName(selectedMonths[0]) : `${selectedMonths.length} måneder`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default TimesheetTracker;


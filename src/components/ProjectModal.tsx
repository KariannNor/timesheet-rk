import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Minus } from 'lucide-react';
import type { Project, CreateProjectData } from '../lib/projectService';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: CreateProjectData) => Promise<void>;
  onUpdate?: (id: string, projectData: Partial<CreateProjectData>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  project?: Project | null;
  isLoading: boolean;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  project,
  isLoading
}) => {
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    budgetHours: null,
    monthlyBudgetHours: null,
    hourlyRate: 1550,
    consultants: [],
    consultantRates: {},
    consultantPercentages: {}, // NEW: prosent per konsulent
    categories: [], // NEW: Categories for time tracking
    projectManagerRate: 1550,
    projectManagerName: '',
    category: 'Prosjekt',
    accessEmail: ''
  });

  const [budgetType, setBudgetType] = useState<'total' | 'monthly' | 'none'>('none');
  const [newConsultantName, setNewConsultantName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState(''); // NEW: For adding categories

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name ?? '',
        budgetHours: project.budgetHours ?? null,
        monthlyBudgetHours: project.monthlyBudgetHours ?? null,
        hourlyRate: project.hourlyRate ?? 1550,
        consultants: project.consultants ?? [],
        consultantRates: project.consultantRates ?? {},
        consultantPercentages: project.consultantPercentages ?? {}, // NEW: Load percentages
        categories: project.categories ?? [], // NEW: Load categories
        projectManagerRate: project.projectManagerRate ?? 1550,
        projectManagerName: project.projectManagerName ?? '',
        category: project.category ?? 'Prosjekt',
        accessEmail: project.accessEmail ?? ''
      });
      
      if (project.monthlyBudgetHours) {
        setBudgetType('monthly');
      } else if (project.budgetHours) {
        setBudgetType('total');
      } else {
        setBudgetType('none');
      }
    } else {
      setFormData({
        name: '',
        budgetHours: null,
        monthlyBudgetHours: null,
        hourlyRate: 1550,
        consultants: [],
        consultantRates: {},
        consultantPercentages: {}, // NEW
        categories: [], // NEW: Reset categories
        projectManagerRate: 1550,
        projectManagerName: '',
        category: 'Prosjekt',
        accessEmail: ''
      });
      setBudgetType('none');
      setNewConsultantName('');
      setNewCategoryName(''); // NEW: Reset category input
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: CreateProjectData = {
      ...formData,
      budgetHours: budgetType === 'total' ? formData.budgetHours : null,
      monthlyBudgetHours: budgetType === 'monthly' ? formData.monthlyBudgetHours : null,
      consultantPercentages: formData.consultantPercentages // ensure included
    };

    if (project && onUpdate) {
      await onUpdate(project.id, submitData);
    } else {
      await onSave(submitData);
    }
  };

  const handleDelete = async () => {
    if (!project || !onDelete) return;
    
    const confirmed = window.confirm(
      `Er du sikker på at du vil slette prosjektet "${project.name}"? Dette vil også slette alle tilhørende timeregistreringer. Denne handlingen kan ikke angres.`
    );
    
    if (confirmed) {
      await onDelete(project.id);
    }
  };

  const addConsultant = () => {
    const name = newConsultantName.trim();
    const currentConsultants = formData.consultants ?? [];
    if (name && !currentConsultants.includes(name)) {
      setFormData(prev => ({
        ...prev,
        consultants: [...(prev.consultants ?? []), name],
        consultantRates: {
          ...(prev.consultantRates ?? {}),
          [name]: prev.hourlyRate ?? 0
        },
        consultantPercentages: {
          ...(prev.consultantPercentages ?? {}),
          [name]: 100 // default 100%
        }
      }));
      setNewConsultantName('');
    }
  };

  const removeConsultant = (consultantToRemove: string) => {
    setFormData(prev => {
      const consultants = prev.consultants ?? [];
      const newConsultantRates = { ...(prev.consultantRates ?? {}) };
      delete newConsultantRates[consultantToRemove];

      const newConsultantPercentages = { ...(prev.consultantPercentages ?? {}) };
      delete newConsultantPercentages[consultantToRemove];
      
      return {
        ...prev,
        consultants: consultants.filter(c => c !== consultantToRemove),
        consultantRates: newConsultantRates,
        consultantPercentages: newConsultantPercentages
      };
    });
  };

  const updateConsultantRate = (consultant: string, rate: number) => {
    setFormData(prev => ({
      ...prev,
      consultantRates: {
        ...(prev.consultantRates ?? {}),
        [consultant]: Number.isNaN(rate) ? 0 : rate
      }
    }));
  };

  const updateConsultantPercentage = (consultant: string, percent: number) => {
    const normalized = Number.isNaN(percent) ? 0 : Math.max(0, Math.min(100, Math.round(percent)));
    setFormData(prev => ({
      ...prev,
      consultantPercentages: {
        ...(prev.consultantPercentages ?? {}),
        [consultant]: normalized
      }
    }));
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    const current = formData.categories ?? [];
    if (name && !current.includes(name)) {
      setFormData(prev => ({
        ...prev,
        categories: [...(prev.categories ?? []), name]
      }));
      setNewCategoryName('');
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      categories: (prev.categories ?? []).filter(c => c !== categoryToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'consultant' | 'category') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'consultant') {
        addConsultant();
      } else {
        addCategory();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {project ? 'Rediger prosjekt' : 'Opprett nytt prosjekt'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Prosjektnavn */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prosjektnavn *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="f.eks. Advokatforeningen CRM"
                required
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="f.eks. Forvaltning, CRM, Utvikling"
              />
              <p className="text-xs text-gray-500 mt-1">
                Beskriv type prosjekt (vises på prosjektkortet)
              </p>
            </div>

            {/* Tilgangsadresse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kunde e-postadresse (tilgang)
              </label>
              <input
                type="email"
                value={formData.accessEmail ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, accessEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="f.eks. kunde@eksempel.no"
              />
              <p className="text-sm text-gray-500 mt-1">
                Denne e-postadressen får lesetilgang til prosjektet. Hvis tom, kun Point Taken ansatte har tilgang.
              </p>
            </div>

            {/* Budsjetttype */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budsjetttype
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="none"
                    checked={budgetType === 'none'}
                    onChange={(e) => setBudgetType(e.target.value as 'total' | 'monthly' | 'none')}
                    className="mr-2"
                  />
                  Ingen budsjettgrense
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="total"
                    checked={budgetType === 'total'}
                    onChange={(e) => setBudgetType(e.target.value as 'total' | 'monthly' | 'none')}
                    className="mr-2"
                  />
                  Total timeramme
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="monthly"
                    checked={budgetType === 'monthly'}
                    onChange={(e) => setBudgetType(e.target.value as 'total' | 'monthly' | 'none')}
                    className="mr-2"
                  />
                  Månedlig budsjett
                </label>
              </div>
            </div>

            {/* Total budsjett */}
            {budgetType === 'total' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total tilgjengelige timer
                </label>
                <input
                  type="number"
                  value={formData.budgetHours || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    budgetHours: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="f.eks. 1886"
                  min="1"
                />
              </div>
            )}

            {/* Månedlig budsjett */}
            {budgetType === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Månedlig timebudsjett
                </label>
                <input
                  type="number"
                  value={formData.monthlyBudgetHours || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    monthlyBudgetHours: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="f.eks. 200"
                  min="1"
                />
              </div>
            )}

            {/* Timepriser */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Standard konsulent timepris (NOK) *
                </label>
                <input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    hourlyRate: parseInt(e.target.value) || 0 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="1550"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Standardpris for nye konsulenter
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prosjektleder timepris (NOK) *
                </label>
                <input
                  type="number"
                  value={formData.projectManagerRate}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    projectManagerRate: parseInt(e.target.value) || 0 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="1550"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Prosjektleder navn */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prosjektleder navn *
              </label>
              <input
                type="text"
                value={formData.projectManagerName}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  projectManagerName: e.target.value 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="f.eks. Kariann Norheim"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Navnet på prosjektlederen som skal vises i timeregistreringer
              </p>
            </div>

            {/* Konsulenter med individuelle priser */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konsulenter som skal jobbe på prosjektet
              </label>
              
              {/* Add consultant input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newConsultantName}
                  onChange={(e) => setNewConsultantName(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'consultant')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Skriv inn konsulent navn..."
                />
                <button
                  type="button"
                  onClick={addConsultant}
                  disabled={!newConsultantName.trim() || (formData.consultants ?? []).includes(newConsultantName.trim())}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              {/* NEW: List of added consultants with individual rates */}
              {(formData.consultants ?? []).length > 0 && (
                <div className="border border-gray-200 rounded-md p-4 space-y-3 max-h-64 overflow-y-auto">
                  {(formData.consultants ?? []).map((consultant, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-3 rounded">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{consultant}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={formData.consultantRates?.[consultant] ?? formData.hourlyRate}
                            onChange={(e) => updateConsultantRate(consultant, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                            min="1"
                          />
                          <span className="text-xs text-gray-500">kr/t</span>
                        </div>

                        {/* NEW: percentage input */}
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={formData.consultantPercentages?.[consultant] ?? 100}
                            onChange={(e) => updateConsultantPercentage(consultant, Number(e.target.value))}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                            min="0"
                            max="100"
                          />
                          <span className="text-xs text-gray-500">%</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeConsultant(consultant)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-500 mt-2">
                {(formData.consultants ?? []).length === 0 
                  ? 'Ingen konsulenter lagt til ennå' 
                  : `${(formData.consultants ?? []).length} konsulent${(formData.consultants ?? []).length !== 1 ? 'er' : ''} lagt til`
                }
              </p>
            </div>

            {/* NEW: Categories section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategorier for timeregistrering
              </label>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'category')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="f.eks. Frontend utvikling, Backend, Testing..."
                />
                <button
                  type="button"
                  onClick={addCategory}
                  disabled={!newCategoryName.trim() || (formData.categories ?? []).includes(newCategoryName.trim())}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              {(formData.categories ?? []).length > 0 && (
                <div className="border border-gray-200 rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                  {(formData.categories ?? []).map((category, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-sm text-gray-900">{category}</span>
                      <button
                        type="button"
                        onClick={() => removeCategory(category)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-sm text-gray-500 mt-2">
                {(formData.categories ?? []).length === 0 
                  ? 'Ingen kategorier lagt til ennå. Kategorier brukes for å organisere timer etter oppgavetype.' 
                  : `${(formData.categories ?? []).length} kategori${(formData.categories ?? []).length !== 1 ? 'er' : ''} lagt til`
                }
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <div>
              {project && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-800 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Slett prosjekt</span>
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.name || (formData.consultants ?? []).length === 0 || !formData.projectManagerName}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Plus size={16} />
                )}
                <span>{project ? 'Oppdater' : 'Opprett'} prosjekt</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
import { useState, useEffect } from 'react'
import { authService, type User } from '../lib/auth'
import { Plus, Settings } from 'lucide-react'
import ProjectModal from './ProjectModal'
import { projectService, type Project, type CreateProjectData } from '../lib/projectService'
import { timeEntryService } from '../lib/supabase'
import logo from '../assets/pt.png'

// Legg til denne type-definisjonen etter imports, rundt linje 7:
type LegacyOrganization = {
  id: string;
  name: string;
  category: string; // Legg til denne linjen
  description: string;
  type: 'legacy';
}

type ProjectWithType = Project & {
  type: 'project';
}

type AccessibleItem = LegacyOrganization | ProjectWithType;

// Definer tilgangskontroll basert på e-postdomener
const getAccessControlForUser = (user: User, allProjects: Project[] = []) => {
  const email = user.email?.toLowerCase() || ''
  
  // Admin tilgang - disse kan se alle prosjekter og administrere
  const adminEmails = [
    'admin@pointtaken.no',
    'kariann@pointtaken.no',
    // Legg til andre admin e-poster her
  ]
  
  if (adminEmails.includes(email)) {
    return {
      role: 'admin' as const,
      canSeeAllProjects: true,
      canCreateProjects: true,
      allowedOrganizations: ['redcross', 'advokatforeningen', 'infunnel'] as string[],
      message: 'Administrator - full tilgang til alle prosjekter'
    }
  }
  
  // Point Taken ansatte (ALLE andre @pointtaken.no) - kan se alle
  if (email.endsWith('@pointtaken.no')) {
    return {
      role: 'admin' as const,
      canSeeAllProjects: true,
      canCreateProjects: true,
      allowedOrganizations: ['redcross', 'advokatforeningen', 'infunnel'] as string[],
      message: 'Point Taken ansatt - full administrasjonstilgang'
    }
  }
  
  // Sjekk om brukeren har tilgang til noen databaseprosjekter
  const userProjects = allProjects.filter(project => 
    project.accessEmail && project.accessEmail.toLowerCase() === email
  );
  
  if (userProjects.length > 0) {
    return {
      role: 'viewer' as const,
      canSeeAllProjects: false,
      canCreateProjects: false,
      allowedOrganizations: [] as string[], // Eksplisitt type
      userProjects: userProjects,
      message: `Kunde - tilgang til ${userProjects.length} prosjekt${userProjects.length !== 1 ? 'er' : ''}`
    }
  }
  
  // Legacy organisasjoner - eksisterende tilgangskontroll
  if (email.endsWith('@redcross.no') || email.endsWith('@rodekors.no')) {
    return {
      role: 'viewer' as const,
      canSeeAllProjects: false,
      canCreateProjects: false,
      allowedOrganizations: ['redcross'] as string[],
      message: 'Røde Kors - tilgang til forvaltningsavtale'
    }
  }
  
  if (email.endsWith('@advokatforeningen.no')) {
    return {
      role: 'viewer' as const,
      canSeeAllProjects: false,
      canCreateProjects: false,
      allowedOrganizations: ['advokatforeningen'] as string[],
      message: 'Advokatforeningen - tilgang til CRM prosjekt'
    }
  }
  
  if (email.endsWith('@infunnel.no') || email.endsWith('@holmen.no')) {
    return {
      role: 'viewer' as const,
      canSeeAllProjects: false,
      canCreateProjects: false,
      allowedOrganizations: ['infunnel'] as string[],
      message: 'Infunnel/Holmen - tilgang til CRM prosjekt'
    }
  }
  
  // Ingen tilgang
  return {
    role: 'none' as const,
    canSeeAllProjects: false,
    canCreateProjects: false,
    allowedOrganizations: [] as string[],
    message: 'Ingen tilgang - kontakt administrator'
  }
}
// Oppdater getLegacyOrganizations funksjonen:
const getLegacyOrganizations = (): LegacyOrganization[] => [
  // Kommentert ut alle legacy organisasjoner
  // {
  //   id: 'redcross',
  //   name: 'Røde Kors',
  //   category: 'Forvaltning',
  //   description: 'DevOps forvaltningsavtale',
  //   type: 'legacy'
  // },
  // {
  //   id: 'advokatforeningen', 
  //   name: 'Advokatforeningen',
  //   category: 'CRM',
  //   description: 'CRM system utvikling',
  //   type: 'legacy'
  // },
  // {
  //   id: 'infunnel',
  //   name: 'Infunnel/Holmen',
  //   category: 'CRM',
  //   description: 'CRM system utvikling',
  //   type: 'legacy'
  // }
]

const LandingPage = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Login form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Project management states
  const [projects, setProjects] = useState<Project[]>([])
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isProjectLoading, setIsProjectLoading] = useState(false)

  useEffect(() => {
    authService.getCurrentUser().then(({ user }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load projects when user is authenticated - ALLE brukere trenger prosjektdata for tilgangskontroll
  useEffect(() => {
    if (user) {
      loadProjects()
    }
  }, [user])

  const loadProjects = async () => {
    try {
      const projectList = await projectService.getAll()
      setProjects(projectList)
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const handleCreateProject = async (projectData: CreateProjectData): Promise<void> => {
    try {
      setIsProjectLoading(true)
      await projectService.create(projectData)
      await loadProjects()
      setIsProjectModalOpen(false)
      setEditingProject(null) // Reset editing project
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Feil ved opprettelse av prosjekt. Prøv igjen.')
    } finally {
      setIsProjectLoading(false)
    }
  }

  const handleUpdateProject = async (id: string, projectData: Partial<CreateProjectData>): Promise<void> => {
    try {
      setIsProjectLoading(true)
      await projectService.update(id, projectData)
      await loadProjects()
      setIsProjectModalOpen(false)
      setEditingProject(null) // Reset editing project
    } catch (error) {
      console.error('Error updating project:', error)
      alert('Feil ved oppdatering av prosjekt. Prøv igjen.')
    } finally {
      setIsProjectLoading(false)
    }
  }

  const handleDeleteProject = async (id: string): Promise<void> => {
    try {
      setIsProjectLoading(true)
      
      // Sjekk om det finnes timeregistreringer for dette prosjektet først
      const timeEntries = await timeEntryService.getAll(id)
      
      if (timeEntries.length > 0) {
        const confirmed = window.confirm(
          `Dette prosjektet har ${timeEntries.length} timeregistreringer. ` +
          `Alle timeregistreringer vil også bli slettet. ` +
          `Er du sikker på at du vil fortsette? Denne handlingen kan ikke angres.`
        )
        
        if (!confirmed) {
          setIsProjectLoading(false)
          return
        }
        
        // Slett alle timeregistreringer først
        for (const entry of timeEntries) {
          await timeEntryService.delete(entry.id)
        }
      }
      
      // Så slett prosjektet
      await projectService.delete(id)
      await loadProjects()
      setIsProjectModalOpen(false)
      setEditingProject(null)
      
      alert('Prosjekt slettet successfully!')
      
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Feil ved sletting av prosjekt: ' + (error instanceof Error ? error.message : 'Ukjent feil'))
    } finally {
      setIsProjectLoading(false)
    }
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setIsProjectModalOpen(true)
  }

  const openCreateModal = () => {
    setEditingProject(null); // Explicitly set to null
    setIsProjectModalOpen(true);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Vennligst fyll inn både e-post og passord')
      return
    }

    try {
      setIsLoggingIn(true)
      setError(null)
      
      const { error } = await authService.signInWithEmail(email, password)
      
      if (error) {
        console.error('Error signing in:', error)
        if (error.message.includes('Invalid login credentials')) {
          setError('Ugyldig e-post eller passord')
        } else {
          setError('Feil ved innlogging: ' + error.message)
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Uventet feil ved innlogging')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return (
   <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="text-center mb-16 mt-10">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src={logo} 
              alt="Point Taken Logo" 
              className="mx-auto h-16 w-auto"
              onError={(e) => {
                // Hide broken image and show text fallback
                const target = e.currentTarget;
                const parent = target.parentNode;
                
                if (parent) {
                  target.style.display = 'none';
                  
                  // Check if fallback already exists to avoid duplicates
                  if (!parent.querySelector('.logo-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'logo-fallback mx-auto w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center';
                    fallback.innerHTML = '<span class="text-white font-bold text-xl">PT</span>';
                    parent.appendChild(fallback);
                  }
                }
              }}
            />
       </div>
        {/* Title and subtitle */}
          {/* <h1 className="text-4xl font-light text-gray-900 mb-4">Prosjektportal</h1> */}
          <p className="text-xl text-gray-600">Logg inn for å se dine prosjekter</p>
        </div>

          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <h2 className="text-2xl font-medium text-gray-900 mb-6 text-center">Logg inn</h2>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              <form onSubmit={handleSignIn}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      E-post
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="din@epost.no"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Passord
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingIn ? 'Logger inn...' : 'Logg inn'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Hent tilgangskontroll for denne brukeren (MED prosjektdata)
  const userAccess = getAccessControlForUser(user, projects)

  // Hvis brukeren ikke har tilgang, vis feilmelding
  if (userAccess.role === 'none') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-medium text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-light text-gray-900">Timesoversikt Portal</h1>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                Logg ut
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto py-16 px-4 text-center">
          <div className="mb-8">
            <svg className="mx-auto h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-medium text-gray-900 mb-4">Ingen tilgang</h2>
          <p className="text-gray-600 mb-8">
            Din e-postadresse <strong>{user.email}</strong> har ikke tilgang til noen prosjekter i systemet.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-left">
            <h3 className="text-sm font-medium text-gray-900 mb-3">For å få tilgang, kontakt administrator:</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Røde Kors ansatte: Bruk @redcross.no eller @rodekors.no e-postadresse</li>
              <li>• Advokatforeningen ansatte: Bruk @advokatforeningen.no e-postadresse</li>
              <li>• Infunnel/Holmen ansatte: Bruk @infunnel.no eller @holmen.no e-postadresse</li>
              <li>• Point Taken ansatte: Kontakt IT-avdelingen for tilgang</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Filtrer organisasjoner basert på brukerens tilgang
  const allowedLegacyOrgs = getLegacyOrganizations().filter(org => 
    userAccess.allowedOrganizations.includes(org.id)
  )

  // Filtrer prosjekter basert på brukerens tilgang
  const allowedProjects = userAccess.canSeeAllProjects 
    ? projects // Show ALL projects for Point Taken employees (admins)
    : userAccess.userProjects || [] // Show user's specific projects

  // Kombiner legacy organisasjoner og database prosjekter
  const allAccessibleItems: AccessibleItem[] = [
    ...allowedLegacyOrgs,
    ...allowedProjects.map(project => ({ ...project, type: 'project' as const }))
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                userAccess.role === 'admin' ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                <span className={`font-medium text-sm ${
                  userAccess.role === 'admin' ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-light text-gray-900">Timesoversikt Portal</h1>
                <p className="text-sm text-gray-600">
                  {user.email} • {userAccess.message}
                </p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              Logg ut
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              {userAccess.canSeeAllProjects ? 'Alle prosjekter' : 'Dine prosjekter'}
            </h2>
            <p className="text-gray-600">
              Du har {userAccess.role === 'admin' ? 'administrator' : 'lesetilgang'} til følgende prosjekter:
            </p>
          </div>

          {/* New Project Button - Only for Admins */}
          {userAccess.canCreateProjects && (
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              <Plus size={16} />
              <span>Opprett nytt prosjekt</span>
            </button>
          )}
        </div>

        {/* Project/Organization Cards */}
        {allAccessibleItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen tilgjengelige prosjekter</h3>
            <p className="text-gray-600 mb-4">
              Du har ikke tilgang til noen prosjekter basert på din e-postadresse.
            </p>
            {userAccess.canCreateProjects && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                <Plus size={16} />
                <span>Opprett prosjekt</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allAccessibleItems.map((item) => {
              const isProject = item.type === 'project';
              
              return (
                <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                      {item.type === 'legacy' && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          Forvaltningsavtale
                        </span>
                      )}
                    </div>
                    {userAccess.canCreateProjects && isProject && (
                      <button
                        onClick={() => openEditModal(item as ProjectWithType)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Settings size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {isProject ? (() => {
                      const project = item as Project;
                      return (
                        <>
                          {/* Vis kategori i stedet for hardkodet "Forvaltning" */}
                          {project.category && (
                            <p className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {project.category}
                            </p>
                          )}
                          
                          {project.budgetHours && project.budgetHours > 0 && (
                            <p>Totalramme: {project.budgetHours} timer</p>
                          )}
                          {project.monthlyBudgetHours && project.monthlyBudgetHours > 0 && (
                            <p>Månedsramme: {project.monthlyBudgetHours} timer</p>
                          )}
                          {project.accessEmail && (
                            <p className="text-blue-600">Tilgang: {project.accessEmail}</p>
                          )}
                        </>
                      );
                    })() : (
                      <>
                        {/* Vis kategori for legacy organisasjoner også */}
                        {(item as LegacyOrganization).category && (
                          <p className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium mb-2">
                            {(item as LegacyOrganization).category}
                          </p>
                        )}
                        <p>{(item as LegacyOrganization).description}</p>
                      </>
                    )}
                  </div>
                  
                  <a
                    href={item.type === 'legacy' ? `/${item.id}` : `/timesheet?org=${item.id}`}
                    className="block w-full text-center px-4 py-2 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Åpne timesoversikt
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Modal - Only for admins */}
      {userAccess.canCreateProjects && (
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => {
            setIsProjectModalOpen(false)
            setEditingProject(null) // Reset when closing
          }}
          onSave={handleCreateProject}
          onUpdate={handleUpdateProject}
          onDelete={handleDeleteProject}
          project={editingProject}
          isLoading={isProjectLoading}
        />
      )}
    </div>
  )
}

export default LandingPage
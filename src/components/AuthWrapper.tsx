import { useState, useEffect } from 'react'
import { authService, type User } from '../lib/auth'
import { projectService } from '../lib/projectService'
import type { Project } from '../types/project'
import TimesheetTracker from './TimesheetTracker'

interface AuthWrapperProps {
  organizationId: string
}

// Forbedret tilgangskontroll som håndterer både legacy og database prosjekter
const getAccessControlForUser = (user: User, project: Project | null) => {
  const email = user.email?.toLowerCase() || ''
  
  // Admin tilgang for Point Taken ansatte (ALLE @pointtaken.no)
  const adminEmails = [
    'admin@pointtaken.no',
    'kariann@pointtaken.no',
  ]
  
  if (adminEmails.includes(email) || email.endsWith('@pointtaken.no')) {
    return {
      role: 'admin',
      hasAccess: true,
      reason: 'Point Taken administrator'
    }
  }
  
  // Legacy organisasjoner - eksisterende tilgangskontroll
  if (project && ['redcross', 'advokatforeningen', 'infunnel'].includes(project.id)) {
    if (project.id === 'redcross' && (email.endsWith('@redcross.no') || email.endsWith('@rodekors.no'))) {
      return {
        role: 'viewer',
        hasAccess: true,
        reason: 'Røde Kors ansatt'
      }
    }
    
    if (project.id === 'advokatforeningen' && email.endsWith('@advokatforeningen.no')) {
      return {
        role: 'viewer',
        hasAccess: true,
        reason: 'Advokatforeningen ansatt'
      }
    }
    
    if (project.id === 'infunnel' && (email.endsWith('@infunnel.no') || email.endsWith('@holmen.no'))) {
      return {
        role: 'viewer',
        hasAccess: true,
        reason: 'Infunnel/Holmen ansatt'
      }
    }
  }
  
  // Database prosjekter - sjekk access_email
  if (project && project.accessEmail) {
    if (email === project.accessEmail.toLowerCase()) {
      return {
        role: 'viewer',
        hasAccess: true,
        reason: 'Autorisert kunde'
      }
    }
  }
  
  return {
    role: 'none',
    hasAccess: false,
    reason: 'Ingen tilgang'
  }
}

const AuthWrapper = ({ organizationId }: AuthWrapperProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(true)

  useEffect(() => {
    authService.getCurrentUser().then(({ user, error }) => {
      if (error) {
        console.error('Error getting current user:', error)
        setError('Feil ved henting av brukerinfo')
      } else {
        setUser(user)
      }
      setLoading(false)
    })

    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      setUser(session?.user || null)
      setError(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load project data when organizationId changes
  useEffect(() => {
    const loadProject = async () => {
      setProjectLoading(true)
      try {
        // First check if it's a legacy organization ID
        const legacyOrgInfo = getLegacyOrganizationInfo(organizationId)
        if (legacyOrgInfo) {
          setProject({
            id: organizationId,
            name: legacyOrgInfo.name,
            budgetHours: null,
            monthlyBudgetHours: null,
            hourlyRate: 1550,
            consultants: [],
            projectManagerRate: 1550,
            createdAt: '',
            updatedAt: ''
          })
        } else {
          // Try to fetch from database (UUID-based project)
          const projects = await projectService.getAll()
          const foundProject = projects.find(p => p.id === organizationId)
          if (foundProject) {
            setProject(foundProject)
          } else {
            setProject({
              id: organizationId,
              name: 'Ukjent prosjekt',
              budgetHours: null,
              monthlyBudgetHours: null,
              hourlyRate: 1550,
              consultants: [],
              projectManagerRate: 1550,
              createdAt: '',
              updatedAt: ''
            })
          }
        }
      } catch (error) {
        console.error('Error loading project:', error)
        setProject({
          id: organizationId,
          name: 'Feil ved lasting av prosjekt',
          budgetHours: null,
          monthlyBudgetHours: null,
          hourlyRate: 1550,
          consultants: [],
          projectManagerRate: 1550,
          createdAt: '',
          updatedAt: ''
        })
      }
      setProjectLoading(false)
    }

    loadProject()
  }, [organizationId])

  const getLegacyOrganizationInfo = (orgId: string) => {
    const orgMap: Record<string, { name: string; theme: string }> = {
      'redcross': { name: 'Røde Kors', theme: 'red' },
      'advokatforeningen': { name: 'Advokatforeningen CRM', theme: 'blue' },
      'infunnel': { name: 'Infunnel/Holmen CRM', theme: 'green' }
    }
    return orgMap[orgId]
  }

  const handleSignOut = async () => {
    const { error } = await authService.signOut()
    if (error) {
      console.error('Error signing out:', error)
      setError('Feil ved utlogging')
    }
  }

  if (loading || projectLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Laster...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center mb-4">
            <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
              ← Tilbake til portal
            </a>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-light text-gray-900">{project?.name || 'Laster...'}</h2>
            <p className="mt-2 text-gray-600">Timesoversikt</p>
            <p className="mt-4 text-sm text-gray-500">
              Du må logge inn for å få tilgang til denne siden
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div className="mt-8">
            <a 
              href="/"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Gå til innlogging
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Sjekk tilgangskontroll
  const userAccess = getAccessControlForUser(user, project)
  
  // Sjekk om brukeren har tilgang til denne organisasjonen
  if (!userAccess.hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gray-50 border-b px-4 py-2">
          <div className="max-w-6xl mx-auto">
            <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
              ← Tilbake til portal
            </a>
          </div>
        </div>

        <div className="max-w-2xl mx-auto py-16 px-4 text-center">
          <div className="mb-8">
            <svg className="mx-auto h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          </div>
          <h2 className="text-2xl font-medium text-gray-900 mb-4">Ingen tilgang</h2>
          <p className="text-gray-600 mb-8">
            Du har ikke tilgang til <strong>{project?.name || organizationId}</strong> med e-postadressen <strong>{user.email}</strong>.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-left mb-8">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Tilgangskrav:</h3>
            <ul className="space-y-1 text-sm text-yellow-700">
              <li>• <strong>Røde Kors:</strong> Krever @redcross.no eller @rodekors.no e-postadresse</li>
              <li>• <strong>Advokatforeningen:</strong> Krever @advokatforeningen.no e-postadresse</li>
              <li>• <strong>Infunnel/Holmen:</strong> Krever @infunnel.no eller @holmen.no e-postadresse</li>
              <li>• <strong>Andre prosjekter:</strong> Krever spesifikk autorisert e-postadresse</li>
              <li>• <strong>Point Taken ansatte:</strong> Har tilgang til alle prosjekter</li>
            </ul>
          </div>
          <a 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Gå til portal
          </a>
        </div>
      </div>
    )
  }

  const isAdmin = userAccess.role === 'admin'

  return (
    <div>
      <div className="bg-gray-50 border-b px-4 py-2">
        <div className="max-w-6xl mx-auto">
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Tilbake til portal
          </a>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isAdmin ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              <span className={`font-medium text-sm ${
                isAdmin ? 'text-green-600' : 'text-blue-600'
              }`}>
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-medium text-gray-900">{project?.name || 'Laster prosjekt...'}</h1>
              <p className="text-sm text-gray-600">
                {user.email} • {userAccess.reason}
              </p>
            </div>
          </div>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Logg ut
          </button>
        </div>
      </div>

      <TimesheetTracker 
        user={user} 
        isReadOnly={!isAdmin}
        organizationId={organizationId}
      />
    </div>
  )
}

export default AuthWrapper
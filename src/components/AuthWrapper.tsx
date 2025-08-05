import { useState, useEffect } from 'react'
import { authService, type User } from '../lib/auth'
import TimesheetTracker from './TimesheetTracker'

const AuthWrapper = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is already logged in
    authService.getCurrentUser().then(({ user, error }) => {
      if (error) {
        console.error('Error getting current user:', error)
        setError('Feil ved henting av brukerinfo')
      } else {
        setUser(user)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event)
      setUser(session?.user || null)
      setError(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignIn = async () => {
    try {
      setError(null)
      const { error } = await authService.signInWithMicrosoft()
      if (error) {
        console.error('Error signing in:', error)
        setError('Feil ved innlogging. Prøv igjen.')
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Uventet feil ved innlogging')
    }
  }

  const handleSignOut = async () => {
    const { error } = await authService.signOut()
    if (error) {
      console.error('Error signing out:', error)
      setError('Feil ved utlogging')
    }
  }

  if (loading) {
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
          <div className="text-center">
            <h2 className="text-3xl font-light text-gray-900">Timesoversikt</h2>
            <p className="mt-2 text-gray-600">Røde Kors - Forvaltningsavtale</p>
            <p className="mt-4 text-sm text-gray-500">
              Logg inn med din Microsoft-konto for å få tilgang
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div className="mt-8">
            <button
              onClick={handleSignIn}
              className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23">
                <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Logg inn med Microsoft
            </button>
          </div>
        </div>
      </div>
    )
  }

  // All users have READ-ONLY access by default
  // You can modify this logic later if you want specific users to have write access
  const isReadOnly = true

  return (
    <div>
      {/* User info bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {user.user_metadata?.avatar_url && (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full"
              />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="text-xs text-gray-500">Kun lesetilgang</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Logg ut
          </button>
        </div>
      </div>

      {/* Pass user info to TimesheetTracker */}
      <TimesheetTracker user={user} isReadOnly={isReadOnly} />
    </div>
  )
}

export default AuthWrapper
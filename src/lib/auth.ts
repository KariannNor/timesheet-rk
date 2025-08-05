import { supabase } from './supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export const authService = {
  // Sign in with Microsoft
  async signInWithMicrosoft() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile',
        redirectTo: 'https://timesoversikt.netlify.app/'
      }
    })
    return { data, error }
  },

  // Rest of the service remains the same...
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
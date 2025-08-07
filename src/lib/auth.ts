import { supabase } from './supabase'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

export const authService = {
  // Sign in with email and password
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Update user role
  async updateUserRole(userId: string, role: 'admin' | 'user') {
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        user_metadata: { role } 
      }
    )
    
    if (error) throw error
    return data
  },

  // Get current user role
  getCurrentUserRole(user: User | null): 'admin' | 'user' {
    return user?.user_metadata?.role || 'user'
  }
}

export type { User }
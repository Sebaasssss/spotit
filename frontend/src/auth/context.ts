import { createContext, useContext } from 'react'
import type * as session from './session'
import type { EndReason, User } from './session'

export type AuthState =
  | { status: 'checking'; user: null; offline: boolean }
  | { status: 'authenticated'; user: User; offline: boolean }
  | { status: 'anonymous'; user: null; offline: boolean; reason?: EndReason }

export type AuthContextValue = AuthState & {
  login: typeof session.login
  register: typeof session.register
  logout: typeof session.logout
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  return context
}

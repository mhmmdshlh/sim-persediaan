import { createContext } from "react"

import type { AuthUser, LoginCredentials } from "@/types/auth"

export interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
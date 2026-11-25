import { useEffect, useState, type ReactNode } from "react"

import type { AuthUser, LoginCredentials } from "@/types/auth"
import * as authService from "@/services/auth-service"

import { AuthContext } from "./auth-context"

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    void authService
      .getCurrentUser()
      .then((currentUser) => {
        if (isActive) {
          setUser(currentUser)
        }
      })
      .catch(() => {
        // Tidak ada sesi aktif. User awal tetap null.
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  const login = async (credentials: LoginCredentials) => {
    const authenticatedUser = await authService.login(credentials)
    setUser(authenticatedUser)
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
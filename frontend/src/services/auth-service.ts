import type { AuthUser, LoginCredentials } from "@/types/auth"
import { apiRequest } from "@/services/api"

interface LoginResponse {
  user: AuthUser
  token: string
}

export async function login(
  credentials: LoginCredentials,
): Promise<AuthUser> {
  const response = await apiRequest<LoginResponse>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
  )

  return response.user
}

export async function getCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/auth/me")
}

export async function logout(): Promise<void> {
  await apiRequest<{ message: string }>("/api/auth/logout", {
    method: "POST",
  })
}
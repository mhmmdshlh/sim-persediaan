export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)

    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

interface ApiSuccess<T> {
  data: T
}

interface ApiErrorResponse {
  error?: {
    code?: string
    message?: string
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  headers.set("Accept", "application/json")

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  })

  const payload: unknown =
    response.status === 204
      ? null
      : await response.json().catch(() => null)

  if (!response.ok) {
    const errorResponse =
      payload !== null &&
      typeof payload === "object" &&
      "error" in payload
        ? (payload as ApiErrorResponse).error
        : undefined

    throw new ApiError(
      response.status,
      errorResponse?.code ?? "REQUEST_FAILED",
      errorResponse?.message ?? "Terjadi kesalahan pada server.",
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  if (
    payload === null ||
    typeof payload !== "object" ||
    !("data" in payload)
  ) {
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      "Format response dari server tidak valid.",
    )
  }

  return (payload as ApiSuccess<T>).data
}
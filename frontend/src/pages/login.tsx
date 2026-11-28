import { useEffect, useState, type SubmitEvent } from "react"
import { Boxes, Eye, EyeOff } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/use-auth"

export function LoginPage() {
  const navigate = useNavigate()
  const { user, isLoading, login } = useAuth()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/", { replace: true })
    }
  }, [isLoading, user, navigate])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      await login({
        username: username.trim(),
        password,
      })

      navigate("/", { replace: true })
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Login gagal. Silakan coba lagi.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-base text-muted-foreground">
          Memeriksa sesi...
        </p>
      </div>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-2">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Boxes className="size-7" aria-hidden="true" />
          </div>

          <CardTitle className="text-2xl font-extrabold">
            Stok Sambel Bledek
          </CardTitle>

          <CardDescription className="text-base">
            Griya Angkringan Sambel Bledek
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-base font-bold">
                Nama Pengguna
              </label>

              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Masukkan nama pengguna"
                autoComplete="username"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-base font-bold">
                Kata Sandi
              </label>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  className="pr-24"
                  required
                  disabled={isSubmitting}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Lihat kata sandi"
                  }
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-bold"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="size-4" aria-hidden="true" />
                      <span>Tutup</span>
                    </>
                  ) : (
                    <>
                      <Eye className="size-4" aria-hidden="true" />
                      <span>Lihat</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <p
                className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-base font-semibold text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

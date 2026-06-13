'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, ArrowRight, Loader2, Lock, Mail, User } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string[] } | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors(null)
    setGeneralError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error && typeof data.error === 'object') {
          setErrors(data.error)
        } else {
          setGeneralError(data.error || 'Failed to create account')
        }
        setLoading(false)
      } else {
        // Success: Redirect to login
        router.push('/login?registered=true')
      }
    } catch (err) {
      setGeneralError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md glow-border p-[1px] relative z-10">
        <div className="glass-card rounded-[inherit] px-8 py-10">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
              <span className="font-semibold text-2xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Dashboard-X
              </span>
            </div>
            <p className="text-zinc-400 text-sm">Create an account to get started</p>
          </div>

          {generalError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-zinc-300 text-sm font-medium mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg py-2 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 text-sm transition-all outline-none"
                />
              </div>
              {errors?.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-zinc-300 text-sm font-medium mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg py-2 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 text-sm transition-all outline-none"
                />
              </div>
              {errors?.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email[0]}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-zinc-300 text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg py-2 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 text-sm transition-all outline-none"
                />
              </div>
              {errors?.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password[0]}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white font-medium rounded-lg py-2.5 text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
            <p className="text-zinc-500 text-xs">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

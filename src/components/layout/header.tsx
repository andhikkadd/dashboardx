'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import {
  Activity,
  ChevronDown,
  Loader2,
  Menu,
  RefreshCw,
  User as UserIcon,
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'

interface HeaderProps {
  onMobileMenuOpen: () => void
}

export default function Header({ onMobileMenuOpen }: HeaderProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [syncing, setSyncing] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Map route to human readable titles
  const getTitle = () => {
    switch (pathname) {
      case '/dashboard':
        return 'Overview'
      case '/accounts':
        return 'X Accounts'
      case '/analytics':
        return 'Analytics'
      case '/logs':
        return 'Sync Logs'
      case '/settings':
        return 'Settings'
      default:
        return 'Dashboard'
    }
  }

  const handleGlobalSync = async () => {
    if (syncing) return
    setSyncing(true)

    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      alert(`Sync completed! Succeeded: ${data.succeeded}, Failed: ${data.failed}`)
      // Force refresh data across page by triggering window event or router refresh
      window.dispatchEvent(new Event('refresh-data'))
    } catch (e) {
      alert('Global sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header className="h-16 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between">
      {/* Left side: Mobile Menu Trigger + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuOpen}
          className="p-2 -ml-2 md:hidden hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-zinc-100">{getTitle()}</h1>
      </div>

      {/* Right side: Global Sync + User Profile */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleGlobalSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 hover:text-zinc-100 text-xs font-medium rounded-lg border border-zinc-800 transition-all cursor-pointer"
        >
          {syncing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>{syncing ? 'Syncing...' : 'Sync All'}</span>
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-sm">
              {session?.user?.name ? session.user.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <span className="hidden sm:inline text-sm text-zinc-300 font-medium">
              {session?.user?.name || 'User'}
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-500 hidden sm:inline" />
          </button>

          {dropdownOpen && (
            <>
              {/* Overlay blocker */}
              <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
              
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 z-40">
                <div className="px-4 py-2 border-b border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-200 truncate">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{session?.user?.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

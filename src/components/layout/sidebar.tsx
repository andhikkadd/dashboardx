'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Users,
} from 'lucide-react'
import { signOut } from 'next-auth/react'

export default function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useUIStore()

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Accounts', href: '/accounts', icon: Users },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Sync Logs', href: '/logs', icon: ScrollText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-zinc-900 bg-zinc-950/60 backdrop-blur-xl transition-all duration-300 z-30 fixed top-0 bottom-0 left-0',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-900">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden shrink-0">
          <div className="p-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-lg bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent transition-opacity duration-300">
              Dashboard-X
            </span>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-1 hover:bg-zinc-900 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative cursor-pointer',
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500 rounded-l-none'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform duration-200 group-hover:scale-105',
                  isActive ? 'text-blue-400' : 'text-zinc-400 group-hover:text-zinc-200'
                )}
              />
              {sidebarOpen && <span>{item.name}</span>}
              {!sidebarOpen && (
                <div className="absolute left-16 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-200 shrink-0 z-50 whitespace-nowrap shadow-xl">
                  {item.name}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-zinc-900">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all group cursor-pointer'
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
          {!sidebarOpen && (
            <div className="absolute left-16 bg-zinc-900 border border-zinc-800 text-red-400 text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-200 shrink-0 z-50 whitespace-nowrap shadow-xl">
              Sign Out
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}

'use client'

import { useSession } from 'next-auth/react'
import {
  Activity,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Info,
  Key,
  Shield,
  Terminal,
  User as UserIcon,
} from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Settings</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Review your profile and system configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details & System Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Profile */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-semibold text-lg text-zinc-100 mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-blue-400" />
              User Profile
            </h3>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-zinc-500 text-xs block mb-1">Full Name</span>
                  <span className="font-semibold text-zinc-200">{session?.user?.name || 'Admin'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs block mb-1">Email Address</span>
                  <span className="font-semibold text-zinc-200">{session?.user?.email || 'admin@dashboardx.com'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-900">
                <div>
                  <span className="text-zinc-500 text-xs block mb-1">Account Role</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Shield className="w-3.5 h-3.5" />
                    {(session?.user as any)?.role || 'ADMIN'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* System Configuration */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-semibold text-lg text-zinc-100 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Monitor Configuration
            </h3>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-zinc-500 text-xs block mb-1">Synchronization Interval</span>
                  <span className="font-semibold text-zinc-200">Every 30 Minutes</span>
                  <span className="text-zinc-600 text-xs block mt-0.5">Configured via SYNC_INTERVAL_MINUTES</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs block mb-1">Maximum Accounts Per User</span>
                  <span className="font-semibold text-zinc-200">10 Accounts</span>
                  <span className="text-zinc-600 text-xs block mt-0.5">Configured via MAX_ACCOUNTS_PER_USER</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-900">
                <div>
                  <span className="text-zinc-500 text-xs block mb-1">Storage State Location</span>
                  <span className="font-semibold text-zinc-200 font-mono">./storage-states/</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs block mb-1">Decryption Security</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    AES-256-CBC Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Worker Setup Guide */}
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-semibold text-lg text-zinc-100 mb-3 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              Background Worker
            </h3>
            
            <p className="text-zinc-400 text-xs leading-relaxed mb-4">
              Dashboard-X relies on an automated background worker process to periodically execute Playwright, scrape profile metrics, and save data snapshots.
            </p>

            <div className="space-y-4 text-xs">
              <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-900 font-mono text-zinc-300">
                <span className="text-zinc-600 block mb-1"># Run the background worker</span>
                <span className="text-blue-400 font-medium">npm run worker</span>
              </div>

              <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-900 font-mono text-zinc-300">
                <span className="text-zinc-600 block mb-1"># Worker outputs logs to console</span>
                <span className="text-zinc-500 block">Worker running...</span>
                <span className="text-zinc-500 block">Starting sync...</span>
                <span className="text-zinc-500 block">Successfully synchronized @akun_a</span>
              </div>

              <div className="p-3 bg-blue-500/5 border border-blue-500/20 text-blue-400/90 rounded-lg flex items-start gap-2.5">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="leading-relaxed text-[11px]">
                  Keep this process running continuously on your host server to compile account stats over time.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-semibold text-lg text-zinc-100 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              Session Info
            </h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Playwright browser context stores cookies and session storage in encrypted JSON files on the server. If an account password changes, or X logs out the session, the dashboard status will display <span className="text-red-400 font-semibold">Expired</span>. To recover, simply delete the account and connect it again.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

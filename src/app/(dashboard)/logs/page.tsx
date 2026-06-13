'use client'

import { useState } from 'react'
import { useLogs, MonitorLog } from '@/hooks/use-logs'
import { useAccounts } from '@/hooks/use-accounts'
import { formatDate } from '@/lib/utils'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  RefreshCw,
  ScrollText,
} from 'lucide-react'

export default function LogsPage() {
  const { data: accounts } = useAccounts()
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')

  const {
    data: logs,
    isLoading,
    refetch,
    isRefetching,
  } = useLogs(selectedAccountId === 'all' ? undefined : selectedAccountId)

  // Helper to determine log level colors/icons
  const getLogStyles = (type: MonitorLog['type']) => {
    switch (type) {
      case 'SYNC_COMPLETE':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          dotColor: 'bg-emerald-500',
        }
      case 'SYNC_FAILED':
      case 'SESSION_EXPIRED':
      case 'ERROR':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-500/10 border-red-500/20 text-red-400',
          dotColor: 'bg-red-500',
        }
      case 'SYNC_START':
        return {
          icon: RefreshCw,
          bgColor: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          dotColor: 'bg-blue-500',
        }
      default:
        return {
          icon: Info,
          bgColor: 'bg-zinc-800 border-zinc-700 text-zinc-300',
          dotColor: 'bg-zinc-500',
        }
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Sync Logs</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Review automation executions, worker runs, and cookies validation logs.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          {/* Account Selector */}
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={isLoading}
              className="bg-zinc-900 border border-zinc-800 focus:border-blue-500 text-zinc-200 text-sm py-1.5 pl-3 pr-8 rounded-lg outline-none cursor-pointer appearance-none min-w-[160px]"
            >
              <option value="all">All Accounts</option>
              {accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  @{acc.username}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center justify-center p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="glass-card rounded-xl border border-zinc-900 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
            <p className="text-zinc-500 text-sm">Retrieving monitor records...</p>
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="divide-y divide-zinc-900">
            {logs.map((log) => {
              const styles = getLogStyles(log.type)
              const Icon = styles.icon
              return (
                <div
                  key={log.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-zinc-900/10 transition-colors"
                >
                  {/* Status Indicator */}
                  <div className={`p-2 border rounded-lg shrink-0 self-start ${styles.bgColor}`}>
                    <Icon className={`w-4 h-4 ${log.type === 'SYNC_START' && isRefetching ? 'animate-spin' : ''}`} />
                  </div>

                  {/* Message Detail */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200">
                          {log.account.displayName || log.account.username}
                        </span>
                        <span className="text-zinc-500 text-xs">@{log.account.username}</span>
                      </div>
                      <span className="text-zinc-500 text-xs">{formatDate(log.createdAt)}</span>
                    </div>

                    <p className="text-zinc-300 text-sm leading-relaxed">{log.message}</p>
                    
                    {log.details && (
                      <pre className="mt-2 text-[10px] font-mono bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 text-zinc-400 overflow-x-auto max-w-full">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <ScrollText className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-200">No logs found</h3>
            <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
              Logs will appear once a synchronization job is triggered manually or automatically by the worker.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

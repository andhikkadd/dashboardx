'use client'

import { useAccounts, useAddAccount } from '@/hooks/use-accounts'
import { useOverview } from '@/hooks/use-analytics'
import { useLogs } from '@/hooks/use-logs'
import { formatNumber, formatDate } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  RefreshCw,
  ScrollText,
  Users,
} from 'lucide-react'
import { Twitter } from '@/components/ui/icons'
import Link from 'next/link'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useOverview()
  const { data: accounts, isLoading: accountsLoading } = useAccounts()
  const { data: logs, isLoading: logsLoading } = useLogs()
  const addAccountMutation = useAddAccount()

  // Listen for global sync completions
  useEffect(() => {
    const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
    }
    window.addEventListener('refresh-data', handleRefresh)
    return () => window.removeEventListener('refresh-data', handleRefresh)
  }, [queryClient])

  const handleAddAccount = async () => {
    try {
      await addAccountMutation.mutateAsync()
    } catch (e: any) {
      alert(e.message || 'Failed to launch login flow')
    }
  }

  const isLoading = overviewLoading || accountsLoading || logsLoading

  if (overviewError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-100 mb-2">Failed to load overview data</h2>
        <p className="text-zinc-400 mb-4">Make sure the PostgreSQL database is running and migrated.</p>
        <button
          onClick={() => queryClient.invalidateQueries()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium cursor-pointer"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Stat Card Config
  const stats = [
    {
      title: 'Total Accounts',
      value: overview?.totalAccounts ?? 0,
      icon: Twitter,
      color: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
      growth: null,
    },
    {
      title: 'Total Followers',
      value: overview?.totalFollowers ?? 0,
      icon: Users,
      color: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
      growth: overview?.growthToday !== undefined ? {
        value: overview.growthToday,
        text: 'today',
      } : null,
    },
    {
      title: 'Total Posts',
      value: overview?.totalPosts ?? 0,
      icon: Activity,
      color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
      growth: null,
    },
    {
      title: 'Growth This Week',
      value: overview?.growthThisWeek ?? 0,
      icon: ArrowUp,
      color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
      growth: null,
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Overview</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Real-time aggregate performance metrics across your X accounts.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddAccount}
            disabled={addAccountMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-sm font-medium rounded-lg text-white shadow-lg shadow-blue-500/15 transition-all cursor-pointer"
          >
            {addAccountMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{addAccountMutation.isPending ? 'Logging in X...' : 'Add Account'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-card rounded-xl p-6 relative overflow-hidden transition-all duration-300">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <span className="text-zinc-400 text-sm font-medium">{stat.title}</span>
                  <div className={`p-2 border rounded-lg ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-3xl font-semibold tracking-tight text-zinc-50">
                    {formatNumber(stat.value)}
                  </span>
                  {stat.growth && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs">
                      {stat.growth.value >= 0 ? (
                        <span className="text-green-500 flex items-center">
                          <ArrowUp className="w-3 h-3 mr-0.5" />
                          +{formatNumber(stat.growth.value)}
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center">
                          <ArrowDown className="w-3 h-3 mr-0.5" />
                          {formatNumber(stat.growth.value)}
                        </span>
                      )}
                      <span className="text-zinc-500">{stat.growth.text}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Analytics Chart & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Followers Growth Chart */}
        <div className="glass-card rounded-xl p-6 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg text-zinc-100">Accounts Growth Comparison</h3>
              <p className="text-zinc-400 text-xs mt-0.5">Followers trend of each active account (last 7 days)</p>
            </div>
          </div>

          <div className="h-72 w-full mt-2">
            {isLoading ? (
              <div className="w-full h-full bg-zinc-900/40 rounded-lg animate-pulse flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
              </div>
            ) : overview && overview.history && overview.history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview.history} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid stroke="#1f1f23" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#52525b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(str) => {
                      const d = new Date(str)
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis
                    stroke="#52525b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => formatNumber(val, true)}
                  />
                  <Tooltip
                    contentStyle={{ background: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    labelClassName="text-zinc-300 text-xs font-semibold"
                    itemStyle={{ fontSize: '12px' }}
                    formatter={(val: any, name: any) => [formatNumber(Number(val)), name]}
                    labelFormatter={(label) => {
                      const d = new Date(label)
                      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }}
                  />
                  {(overview.usernames || []).map((username, index) => {
                    const colors = [
                      '#3b82f6', // blue
                      '#ec4899', // pink
                      '#10b981', // green
                      '#f59e0b', // amber
                      '#8b5cf6', // violet
                      '#06b6d4', // cyan
                      '#f43f5e', // rose
                    ]
                    const color = colors[index % colors.length]
                    return (
                      <Line
                        key={username}
                        type="monotone"
                        dataKey={username}
                        name={`@${username}`}
                        stroke={color}
                        strokeWidth={2.5}
                        dot={{ fill: color, stroke: '#09090b', strokeWidth: 1.5, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full border border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center text-center p-6">
                <Users className="w-10 h-10 text-zinc-600 mb-2" />
                <p className="text-zinc-400 text-sm">No historical data available</p>
                <p className="text-zinc-600 text-xs mt-1">Stats will compile as accounts are added and synchronized.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Short Sync Logs */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-semibold text-lg text-zinc-100 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={handleAddAccount}
                disabled={addAccountMutation.isPending}
                className="w-full flex items-center justify-between p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 transition-all cursor-pointer group"
              >
                <span className="font-medium">Connect New X Account</span>
                <Plus className="w-4 h-4 text-zinc-500 group-hover:text-blue-500 transition-colors" />
              </button>
              
              <Link
                href="/accounts"
                className="w-full flex items-center justify-between p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 transition-all group"
              >
                <span className="font-medium">Manage Accounts Table</span>
                <ArrowUp className="w-4 h-4 rotate-45 text-zinc-500 group-hover:text-blue-500 transition-colors" />
              </Link>

              <Link
                href="/logs"
                className="w-full flex items-center justify-between p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 transition-all group"
              >
                <span className="font-medium">Review Monitor Logs</span>
                <ScrollText className="w-4 h-4 text-zinc-500 group-hover:text-blue-500 transition-colors" />
              </Link>
            </div>
          </div>

          {/* Recent Sync Status */}
          <div className="glass-card rounded-xl p-6 flex-1 flex flex-col">
            <h3 className="font-semibold text-lg text-zinc-100 mb-4">Recent Activity</h3>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[170px] pr-1">
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-10 w-full bg-zinc-900 rounded animate-pulse" />
                  <div className="h-10 w-full bg-zinc-900 rounded animate-pulse" />
                  <div className="h-10 w-full bg-zinc-900 rounded animate-pulse" />
                </div>
              ) : logs && logs.length > 0 ? (
                logs.slice(0, 4).map((log) => (
                  <div key={log.id} className="flex gap-2.5 items-start text-xs border-b border-zinc-900 pb-2.5 last:border-0 last:pb-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        log.type.includes('FAIL') || log.type.includes('EXPIRED')
                          ? 'bg-red-500'
                          : log.type.includes('COMPLETE')
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-300 font-medium line-clamp-1">{log.message}</p>
                      <div className="flex justify-between items-center mt-0.5 text-zinc-500">
                        <span>@{log.account.username}</span>
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-4">
                  <p className="text-zinc-500 text-xs">No activity logs recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

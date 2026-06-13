'use client'

import { useState } from 'react'
import {
  useAccounts,
  useAddAccount,
  useSyncAccount,
  useDeleteAccount,
  Account,
} from '@/hooks/use-accounts'
import { formatNumber, formatDate, getInitials } from '@/lib/utils'
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Terminal,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { Twitter } from '@/components/ui/icons'

type SortField = 'followers' | 'growth' | 'username' | 'lastSync'
type SortOrder = 'asc' | 'desc'

export default function AccountsPage() {
  const { data: accounts, isLoading, error, refetch } = useAccounts()
  const addAccountMutation = useAddAccount()
  const syncAccountMutation = useSyncAccount()
  const deleteAccountMutation = useDeleteAccount()

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('followers')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'browser' | 'cookie'>('cookie') // Default to cookie as it's safer
  const [manualUsername, setManualUsername] = useState('')
  const [manualAuthToken, setManualAuthToken] = useState('')
  const [manualCt0, setManualCt0] = useState('')
  const [isSubmittingManual, setIsSubmittingManual] = useState(false)

  const handleAddAccountBrowser = async () => {
    try {
      await addAccountMutation.mutateAsync()
      setShowAddModal(false)
      refetch()
    } catch (e: any) {
      alert(e.message || 'Failed to connect account via browser')
    }
  }

  const handleManualImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualUsername || !manualAuthToken) {
      alert('Username dan auth_token wajib diisi!')
      return
    }

    setIsSubmittingManual(true)
    try {
      const res = await fetch('/api/accounts/add-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: manualUsername,
          authToken: manualAuthToken,
          ct0: manualCt0 || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memverifikasi cookies Twitter.')
      }

      alert(`Sukses menambahkan akun @${manualUsername}!`)
      setShowAddModal(false)
      setManualUsername('')
      setManualAuthToken('')
      setManualCt0('')
      
      // Refresh list
      refetch()
      window.dispatchEvent(new Event('refresh-data'))
    } catch (e: any) {
      alert(e.message || 'Gagal memvalidasi cookies')
    } finally {
      setIsSubmittingManual(false)
    }
  }

  const handleSyncAccount = async (id: string) => {
    setSyncingId(id)
    try {
      await syncAccountMutation.mutateAsync(id)
    } catch (e: any) {
      alert(e.message || 'Sync failed')
    } finally {
      setSyncingId(null)
    }
  }

  const handleDeleteAccount = async (id: string, username: string) => {
    if (!confirm(`Are you sure you want to remove @${username} and all its snapshots?`)) {
      return
    }
    setDeletingId(id)
    try {
      await deleteAccountMutation.mutateAsync(id)
    } catch (e) {
      alert('Failed to delete account')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // Filter and sort accounts
  const filteredAccounts = accounts
    ? accounts.filter((acc) => {
        const query = searchQuery.toLowerCase()
        return (
          acc.username.toLowerCase().includes(query) ||
          (acc.displayName && acc.displayName.toLowerCase().includes(query)) ||
          (acc.label && acc.label.toLowerCase().includes(query))
        )
      })
    : []

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    let multiplier = sortOrder === 'asc' ? 1 : -1
    
    if (sortBy === 'username') {
      return a.username.localeCompare(b.username) * multiplier
    }
    
    if (sortBy === 'followers') {
      return (a.metrics.followers - b.metrics.followers) * multiplier
    }
    
    if (sortBy === 'growth') {
      return (a.growth.followers - b.growth.followers) * multiplier
    }
    
    if (sortBy === 'lastSync') {
      const dateA = a.lastSyncAt ? new Date(a.lastSyncAt).getTime() : 0
      const dateB = b.lastSyncAt ? new Date(b.lastSyncAt).getTime() : 0
      return (dateA - dateB) * multiplier
    }
    
    return 0
  })

  // Helper component for account status badge
  const StatusBadge = ({ status }: { status: Account['status'] }) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active
          </span>
        )
      case 'SESSION_EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Expired
          </span>
        )
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Error
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <XCircle className="w-3.5 h-3.5" />
            Inactive
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 font-sans">Twitter Accounts</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Manage your logged X (Twitter) accounts and check their session statuses.
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm font-medium rounded-lg text-white shadow-lg shadow-blue-500/15 transition-all cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/40 border border-zinc-900 rounded-xl p-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg py-1.5 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 text-sm outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-zinc-500">
          <span>Active sessions:</span>
          <span className="font-semibold text-zinc-300">
            {accounts ? accounts.filter((a) => a.status === 'ACTIVE').length : 0} / {accounts?.length || 0}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card rounded-xl overflow-hidden border border-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-900/10 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Account</th>
                <th className="py-4 px-4 cursor-pointer hover:text-zinc-200 transition-colors" onClick={() => handleSort('username')}>
                  <div className="flex items-center gap-1">
                    Username
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-4 px-4 cursor-pointer hover:text-zinc-200 transition-colors" onClick={() => handleSort('followers')}>
                  <div className="flex items-center gap-1">
                    Followers
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-4 px-4">Following</th>
                <th className="py-4 px-4">Posts</th>
                <th className="py-4 px-4 cursor-pointer hover:text-zinc-200 transition-colors" onClick={() => handleSort('growth')}>
                  <div className="flex items-center gap-1">
                    Growth Today
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-4 px-4 cursor-pointer hover:text-zinc-200 transition-colors" onClick={() => handleSort('lastSync')}>
                  <div className="flex items-center gap-1">
                    Last Sync
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-sm text-zinc-300">
              {isLoading ? (
                // Table skeleton
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="bg-transparent animate-pulse">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-full" />
                        <div className="space-y-2">
                          <div className="h-4 w-24 bg-zinc-800 rounded" />
                          <div className="h-3 w-16 bg-zinc-800 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-12 bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-28 bg-zinc-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-zinc-800 rounded-full" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-8 w-16 bg-zinc-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : sortedAccounts.length > 0 ? (
                sortedAccounts.map((account) => (
                  <tr key={account.id} className="bg-transparent hover:bg-zinc-900/35 transition-colors">
                    {/* Account Profile info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {account.profileImage ? (
                          <img
                            src={account.profileImage}
                            alt={account.displayName || account.username}
                            className="w-10 h-10 rounded-full border border-zinc-800 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-sm">
                            {getInitials(account.displayName || account.username)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-zinc-100 flex items-center gap-1">
                            {account.displayName || account.username}
                            {account.verified && (
                              <svg className="w-4 h-4 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                              </svg>
                            )}
                          </div>
                          {account.label && (
                            <span className="text-zinc-500 text-xs px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
                              {account.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Username */}
                    <td className="py-4 px-4">
                      <a
                        href={account.profileUrl || `https://x.com/${account.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        @{account.username}
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                      </a>
                    </td>

                    {/* Followers */}
                    <td className="py-4 px-4 font-semibold text-zinc-100">
                      {formatNumber(account.metrics.followers)}
                    </td>

                    {/* Following */}
                    <td className="py-4 px-4">
                      {formatNumber(account.metrics.following)}
                    </td>

                    {/* Posts */}
                    <td className="py-4 px-4">
                      {formatNumber(account.metrics.posts)}
                    </td>

                    {/* Growth Today */}
                    <td className="py-4 px-4">
                      {account.growth.followers > 0 ? (
                        <span className="text-emerald-500 font-semibold">
                          +{formatNumber(account.growth.followers)}
                        </span>
                      ) : account.growth.followers < 0 ? (
                        <span className="text-red-500 font-semibold">
                          {formatNumber(account.growth.followers)}
                        </span>
                      ) : (
                        <span className="text-zinc-500">0</span>
                      )}
                    </td>

                    {/* Last Sync */}
                    <td className="py-4 px-4 text-zinc-400 text-xs">
                      {formatDate(account.lastSyncAt)}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <StatusBadge status={account.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSyncAccount(account.id)}
                          disabled={syncingId === account.id || deletingId === account.id}
                          title="Trigger profile update"
                          className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 rounded-lg text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {syncingId === account.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteAccount(account.id, account.username)}
                          disabled={syncingId === account.id || deletingId === account.id}
                          title="Delete account"
                          className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-red-500/40 rounded-lg text-zinc-400 hover:text-red-400 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {deletingId === account.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                // Empty state
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Twitter className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-zinc-200">No accounts connected</h3>
                    <p className="text-zinc-500 text-sm max-w-md mx-auto mt-1">
                      Click the "Add Account" button to log into X and save your session.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal Pop-up */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
                  <Twitter className="w-5 h-5 text-blue-400" />
                  Connect Twitter Account
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  Hubungkan sesi akun X untuk mulai memantau analitik performa.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-zinc-900 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('cookie')}
                className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'cookie'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Manual Cookie Import (Aman & Bypass Rate Limit)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('browser')}
                className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'browser'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Interactive Login (Headed Browser)
              </button>
            </div>

            {/* Tab: Browser Login */}
            {activeTab === 'browser' && (
              <div className="space-y-6 py-2 flex-1 overflow-y-auto">
                <div className="p-4 bg-amber-500/5 border border-amber-500/10 text-amber-400/90 rounded-lg text-xs leading-relaxed flex gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    <strong>Perhatian:</strong> Metode ini akan membuka jendela browser Chromium otomatis di komputer host server. Twitter/X terkadang membatasi login otomatis dengan pesan <em>"We've temporarily limited your login"</em>. Jika diblokir, gunakan metode <strong>Cookie Import</strong>.
                  </p>
                </div>

                <div className="text-center py-6 border border-dashed border-zinc-900 rounded-lg">
                  <Terminal className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-300 text-sm font-semibold">Automated Login Window</p>
                  <p className="text-zinc-500 text-xs mt-1 max-w-xs mx-auto">
                    Sebuah jendela browser interaktif akan pop-up. Setelah Anda login sukses di sana, browser akan tertutup otomatis.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-transparent rounded-lg text-zinc-300 text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAccountBrowser}
                    disabled={addAccountMutation.isPending}
                    className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {addAccountMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {addAccountMutation.isPending ? 'Browser Active...' : 'Launch Browser Login'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Cookie Import */}
            {activeTab === 'cookie' && (
              <form onSubmit={handleManualImportSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
                <div className="p-3.5 bg-blue-500/5 border border-blue-500/10 text-blue-400/90 rounded-lg text-xs leading-relaxed space-y-2">
                  <div className="flex gap-2 font-semibold items-center">
                    <Key className="w-4 h-4 shrink-0" />
                    <span>Metode Bypass Aman (Tanpa Login Popup)</span>
                  </div>
                  <p>
                    Masukkan kode session token Anda langsung dari browser Chrome/Edge tempat Anda sudah login di X.com. Cara mendapatkannya:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Buka x.com di browser biasa Anda yang sudah login.</li>
                    <li>Tekan <strong>F12</strong> (DevTools) &gt; Tab <strong>Application</strong> (atau <strong>Storage</strong>) &gt; Menu <strong>Cookies</strong> &gt; <code>https://x.com</code>.</li>
                    <li>Cari baris bernama <code>auth_token</code>, lalu salin/copy nilainya (panjangnya sekitar 40 karakter hex).</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-400 text-xs font-semibold block">Username Twitter/X</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">@</span>
                    <input
                      type="text"
                      required
                      placeholder="username_akun"
                      value={manualUsername}
                      onChange={(e) => setManualUsername(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-lg py-2 pl-7 pr-4 text-zinc-200 placeholder-zinc-700 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-400 text-xs font-semibold block flex items-center justify-between">
                    <span>Cookie auth_token (Wajib)</span>
                    <span className="text-[10px] text-red-500">Required</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Contoh: a45b98df981e7d..."
                    value={manualAuthToken}
                    onChange={(e) => setManualAuthToken(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-lg py-2 px-3.5 text-zinc-200 placeholder-zinc-700 text-sm outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-400 text-xs font-semibold block flex items-center gap-1.5">
                    <span>Cookie ct0 (Opsional)</span>
                    <span className="text-[10px] text-zinc-600">(CSRF Token)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Contoh: c28271e86a..."
                    value={manualCt0}
                    onChange={(e) => setManualCt0(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-lg py-2 px-3.5 text-zinc-200 placeholder-zinc-700 text-sm outline-none transition-all font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-transparent rounded-lg text-zinc-300 text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingManual}
                    className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    {isSubmittingManual && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmittingManual ? 'Verifying Cookies...' : 'Import & Connect'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

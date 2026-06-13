import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface AccountMetrics {
  followers: number
  following: number
  posts: number
  likes: number
}

export interface AccountGrowth {
  followers: number
  posts: number
}

export interface Account {
  id: string
  username: string
  displayName: string | null
  label: string | null
  profileImage: string | null
  bio: string | null
  verified: boolean
  profileUrl: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'SESSION_EXPIRED' | 'ERROR'
  lastSyncAt: string | null
  metrics: AccountMetrics
  growth: AccountGrowth
}

export function useAccounts() {
  return useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts')
      if (!res.ok) throw new Error('Failed to fetch accounts')
      return res.json()
    },
  })
}

export function useAddAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/accounts/add-session', {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to authenticate account')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete account')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

export function useSyncAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/accounts/${id}/sync`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to sync account')
      }
      return res.json()
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['accounts', id] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
    },
  })
}

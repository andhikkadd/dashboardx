import { useQuery } from '@tanstack/react-query'

export interface OverviewStats {
  totalAccounts: number
  totalFollowers: number
  totalFollowing: number
  totalPosts: number
  growthToday: number
  growthThisWeek: number
  history: Array<{
    date: string
    total: number
    [username: string]: any
  }>
  usernames: string[]
}

export interface Snapshot {
  id: string
  accountId: string
  followers: number
  following: number
  posts: number
  likes: number
  capturedAt: string
}

export function useOverview() {
  return useQuery<OverviewStats>({
    queryKey: ['overview'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/overview')
      if (!res.ok) throw new Error('Failed to fetch overview stats')
      return res.json()
    },
  })
}

export function useAccountDetail(id: string | null) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/api/accounts/${id}`)
      if (!res.ok) throw new Error('Failed to fetch account detail')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useComparisonAnalytics(period: string) {
  return useQuery<{
    history: Array<{
      date: string
      [key: string]: any
    }>
    usernames: string[]
  }>({
    queryKey: ['comparison', period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/comparison?period=${period}`)
      if (!res.ok) throw new Error('Failed to fetch comparison analytics')
      return res.json()
    },
  })
}

import { useQuery } from '@tanstack/react-query'

export interface MonitorLog {
  id: string
  accountId: string
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SYNC_START' | 'SYNC_COMPLETE' | 'SYNC_FAILED' | 'SESSION_EXPIRED'
  message: string
  details: any
  createdAt: string
  account: {
    username: string
    displayName: string | null
  }
}

export function useLogs(accountId?: string) {
  return useQuery<MonitorLog[]>({
    queryKey: ['logs', { accountId }],
    queryFn: async () => {
      const url = accountId ? `/api/logs?accountId=${accountId}` : '/api/logs'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch logs')
      return res.json()
    },
  })
}

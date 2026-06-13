import { create } from 'zustand'

export type PeriodType = '7d' | '30d' | '90d'
export type SortByType = 'followers' | 'growth' | 'username' | 'lastSync'
export type SortOrderType = 'asc' | 'desc'

interface UIState {
  sidebarOpen: boolean
  selectedPeriod: PeriodType
  selectedAccountId: string | null
  sortBy: SortByType
  sortOrder: SortOrderType
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setPeriod: (period: PeriodType) => void
  setSelectedAccount: (id: string | null) => void
  setSortBy: (sort: SortByType) => void
  toggleSortOrder: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  selectedPeriod: '7d',
  selectedAccountId: null,
  sortBy: 'followers',
  sortOrder: 'desc',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setPeriod: (period) => set({ selectedPeriod: period }),
  setSelectedAccount: (id) => set({ selectedAccountId: id }),
  setSortBy: (sort) =>
    set((state) => {
      if (state.sortBy === sort) {
        return { sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' }
      }
      return { sortBy: sort, sortOrder: 'desc' }
    }),
  toggleSortOrder: () =>
    set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' })),
}))

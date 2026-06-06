import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface SidebarLayoutValue {
  sidebarOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
}

const SidebarLayoutContext = createContext<SidebarLayoutValue | null>(null)

export function SidebarLayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  const value = useMemo(
    () => ({ sidebarOpen, toggleSidebar, closeSidebar }),
    [sidebarOpen, toggleSidebar, closeSidebar],
  )
  return <SidebarLayoutContext.Provider value={value}>{children}</SidebarLayoutContext.Provider>
}

export function useSidebarLayout() {
  const ctx = useContext(SidebarLayoutContext)
  if (!ctx) {
    throw new Error('useSidebarLayout must be used within SidebarLayoutProvider')
  }
  return ctx
}

/** Semi-transparent overlay; closes drawer on tap (mobile only). */
export function MobileSidebarBackdrop() {
  const { sidebarOpen, closeSidebar } = useSidebarLayout()
  if (!sidebarOpen) return null
  return (
    <button
      type="button"
      aria-label="Close menu"
      className="fixed inset-0 z-30 cursor-default bg-black/40 lg:hidden"
      onClick={closeSidebar}
    />
  )
}

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 1023px)').matches
}

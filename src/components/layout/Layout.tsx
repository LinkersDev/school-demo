import { useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { useAuthStore } from '../../store/authStore'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import {
  isMobileViewport,
  MobileSidebarBackdrop,
  SidebarLayoutProvider,
  useSidebarLayout,
} from './SidebarLayoutContext'

function MobileSidebarCloseOnNavigate() {
  const location = useLocation()
  const { closeSidebar } = useSidebarLayout()
  useEffect(() => {
    if (isMobileViewport()) closeSidebar()
  }, [location.pathname, location.search, closeSidebar])
  return null
}

export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const isMessagesRoute =
    location.pathname === '/messages' || location.pathname.endsWith('/messages')

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <SidebarLayoutProvider>
      <MobileSidebarCloseOnNavigate />
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <MobileSidebarBackdrop />
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main
            className={cn(
              'flex-1 overflow-x-hidden',
              isMessagesRoute
                ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                : 'overflow-y-auto p-3 sm:p-4 md:p-6',
            )}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarLayoutProvider>
  )
}

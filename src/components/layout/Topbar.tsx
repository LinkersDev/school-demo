import { Bell, LogOut, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useSidebarLayout } from './SidebarLayoutContext'
import { isDemoMode } from '../../demo/env'
import { cn } from '../../utils/cn'

export default function Topbar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { toggleSidebar } = useSidebarLayout()

  const { data } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.get('/notifications/unread-count/').then(r => r.data),
    refetchInterval: 30000,
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
      <button
        type="button"
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 lg:hidden min-h-[44px] min-w-[44px] items-center justify-center flex"
        aria-label="Open navigation menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="min-w-0 flex-1" aria-hidden />
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          onClick={isDemoMode ? undefined : () => navigate('/notifications')}
          className={cn(
            'relative p-2 rounded-lg transition',
            isDemoMode
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
          )}
          title={isDemoMode ? 'Notifications (disabled in demo)' : 'Notifications'}
          disabled={isDemoMode}
        >
          <Bell className="w-5 h-5" />
          {!isDemoMode && data?.count > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
          )}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </header>
  )
}

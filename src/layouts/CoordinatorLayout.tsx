import type { ElementType } from 'react'
import { Outlet, Navigate, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Topbar from '../components/layout/Topbar'
import { SidebarLayoutProvider } from '../components/layout/SidebarLayoutContext'
import {
  LayoutDashboard, GraduationCap, UserCheck, ClipboardList,
  FileText, BarChart2, BookMarked, FolderOpen,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { SCHOOL_NAME_SHORT } from '../constants/school'

const NAV: { to: string; label: string; icon: ElementType }[] = [
  { to: '/dashboard/coordinator', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: GraduationCap },
  { to: '/teachers', label: 'Teachers', icon: UserCheck },
  { to: '/attendance', label: 'Attendance', icon: ClipboardList },
  { to: '/lesson-plans', label: 'Lesson Plans', icon: FileText },
  { to: '/admin/homework-explorer', label: 'Homework explorer', icon: FolderOpen },
  { to: '/academics/dashboard', label: 'Academic / Assessment', icon: BarChart2 },
]

export default function CoordinatorLayout() {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (user.role !== 'coordinator') {
    return <Navigate to="/" replace />
  }

  return (
    <SidebarLayoutProvider>
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-60 bg-slate-900 text-white flex flex-col h-full border-r border-slate-800">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight">{SCHOOL_NAME_SHORT}</div>
              <div className="text-[11px] text-slate-400">Academic Coordinator</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard/coordinator'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user.full_name}</div>
              <div className="text-xs text-slate-400 truncate">Coordinator</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
    </SidebarLayoutProvider>
  )
}

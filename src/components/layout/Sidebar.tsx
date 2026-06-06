import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, GraduationCap, BookOpen, FolderOpen,
  ClipboardList, FileText, BarChart2, UserCheck, BookMarked,
  Settings, School, Bus, MessageSquare, X,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { isMobileViewport, useSidebarLayout } from './SidebarLayoutContext'
import { SCHOOL_NAME_SHORT, SCHOOL_SYSTEM_LABEL } from '../../constants/school'
import { isDemoMode } from '../../demo/env'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  scopes?: string[]
  roles?: string[]
  disabled?: boolean
}

interface NavGroup {
  type: 'group'
  label: string
  items: NavItem[]
}

type NavEntry = NavItem | NavGroup

interface NavSection {
  heading: string
  items: NavEntry[]
}

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'type' in entry && entry.type === 'group'
}

const TEACHER_NAV_ITEMS: NavItem[] = [
  { to: '/dashboard/teacher', label: 'Dashboard',       icon: LayoutDashboard, roles: ['teacher'] },
  { to: '/my-classes',        label: 'My Classes',      icon: GraduationCap,   roles: ['teacher'] },
  { to: '/attendance',        label: 'Attendance',      icon: ClipboardList,   scopes: ['attendance.read'], roles: ['teacher'] },
  { to: '/homework',          label: 'Homework',        icon: BookOpen,        scopes: ['homework.read'], roles: ['teacher'] },
  { to: '/my-lesson-plans',   label: 'Lesson Planning', icon: FileText,        scopes: ['lessonplans.read'], roles: ['teacher'] },
  { to: '/academics/teacher-upload', label: 'Upload grades', icon: BarChart2, scopes: ['grades.read', 'grades.manage'], roles: ['teacher'] },
  { to: '/messages',          label: 'Messages',        icon: MessageSquare,   roles: ['teacher'] },
]

/** Parent portal: only routes that show data scoped to linked children */
const PARENT_NAV_ITEMS: NavItem[] = [
  { to: '/dashboard/parent', label: 'Dashboard',   icon: LayoutDashboard, roles: ['parent'] },
  { to: '/parent/attendance', label: 'Attendance', icon: ClipboardList,   scopes: ['attendance.read'], roles: ['parent'] },
  { to: '/parent/homework',   label: 'Homework',   icon: BookOpen,        scopes: ['homework.read'], roles: ['parent'] },
  { to: '/parent/grades',     label: 'Grades',     icon: BarChart2,       scopes: ['grades.read'], roles: ['parent'] },
  { to: '/parent/lesson-plans', label: 'Lesson Plans', icon: BookMarked, scopes: ['lessonplans.read'], roles: ['parent'] },
  { to: '/messages',          label: 'Messages',   icon: MessageSquare,   roles: ['parent'] },
]

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Main',
    items: [
      { to: '/students',         label: 'Students',            icon: GraduationCap, scopes: ['students.read']                            },
      { to: '/teachers',         label: 'Teachers',            icon: UserCheck,     scopes: ['teachers.read']                            },
    ],
  },
  {
    heading: 'Academics',
    items: [
      { to: '/attendance',       label: 'Attendance',          icon: ClipboardList, scopes: ['attendance.read']                          },
      {
        to: '/admin/homework-explorer',
        label: 'Homework explorer',
        icon: FolderOpen,
        scopes: ['homework.read'],
        roles: ['admin', 'coordinator'],
      },
      { to: '/lesson-plans',     label: 'Lesson Plans',        icon: FileText,      scopes: ['lessonplans.read']                         },
      {
        to: '/academics',
        label: 'Academic / Assessment',
        icon: BarChart2,
        scopes: ['grades.read'],
      },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { to: '/classes',          label: 'Classes & Subjects',  icon: School,        scopes: ['students.manage', 'users.manage']          },
      { to: '/users',            label: 'User Management',     icon: Settings,      scopes: ['users.manage'],       disabled: isDemoMode },
      { to: '/transportation',   label: 'Transportation',      icon: Bus,           scopes: ['students.read']                            },
    ],
  },
  {
    heading: 'Communication',
    items: [
      { to: '/messages',         label: 'Messages',            icon: MessageSquare                                                       },
    ],
  },
]

export default function Sidebar() {
  const { user, hasScope } = useAuth()
  const { sidebarOpen, closeSidebar } = useSidebarLayout()

  const onNavActivate = () => {
    if (isMobileViewport()) closeSidebar()
  }

  const getDashboardLink = () => {
    if (user?.role === 'teacher') return '/dashboard/teacher'
    if (user?.role === 'parent')  return '/dashboard/parent'
    if (user?.role === 'coordinator') return '/dashboard/coordinator'
    return '/dashboard/admin'
  }

  const canSee = (item: NavItem) => {
    if (item.roles && !item.roles.includes(user?.role ?? '')) return false
    if (item.scopes && !item.scopes.some(s => hasScope(s))) return false
    return true
  }

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-shrink-0 flex-col border-r border-slate-800/90 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white shadow-[4px_0_24px_-8px_rgba(15,23,42,0.45)] transition-transform duration-200 ease-out',
        'fixed inset-y-0 left-0 z-40 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
    >

      {/* Logo */}
      <div className="border-b border-slate-800 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-400/25">
              <BookMarked className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold leading-tight text-white">{SCHOOL_NAME_SHORT}</div>
              <div className="text-xs text-slate-400">{SCHOOL_SYSTEM_LABEL}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {user?.role === 'teacher' ? (
          <div className="space-y-0.5">
            {TEACHER_NAV_ITEMS.filter(canSee).map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavActivate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/30'
                        : 'text-slate-300 hover:bg-slate-800/90 hover:text-white',
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        ) : user?.role === 'parent' ? (
          <div className="space-y-0.5">
            {PARENT_NAV_ITEMS.filter(canSee).map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavActivate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/30'
                        : 'text-slate-300 hover:bg-slate-800/90 hover:text-white',
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        ) : (
          <>
            {/* Dashboard link — always visible */}
            <div>
              <NavLink
                to={getDashboardLink()}
                onClick={onNavActivate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/30'
                      : 'text-slate-300 hover:bg-slate-800/90 hover:text-white',
                  )
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
            </div>

            {/* Sectioned nav items */}
            {NAV_SECTIONS.map((section) => {
              const renderLink = (item: NavItem) => {
                const Icon = item.icon
                if (item.disabled) {
                  return (
                    <span
                      key={item.to}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 cursor-not-allowed opacity-50"
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </span>
                  )
                }
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavActivate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/30'
                          : 'text-slate-300 hover:bg-slate-800/90 hover:text-white',
                      )
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </NavLink>
                )
              }

              const blocks: ReactNode[] = []
              for (const entry of section.items) {
                if (isNavGroup(entry)) {
                  const visible = entry.items.filter(canSee)
                  if (visible.length === 0) continue
                  blocks.push(
                    <div key={entry.label} className="space-y-0.5">
                      <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        {entry.label}
                      </p>
                      <div className="ml-2 space-y-0.5 border-l border-slate-700/80 pl-1">
                        {visible.map(renderLink)}
                      </div>
                    </div>,
                  )
                } else if (canSee(entry)) {
                  blocks.push(<div key={entry.to}>{renderLink(entry)}</div>)
                }
              }
              if (blocks.length === 0) return null
              return (
                <div key={section.heading}>
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    {section.heading}
                  </p>
                  <div className="space-y-3">
                    {blocks}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold shadow-sm ring-2 ring-indigo-400/20">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{user?.full_name}</div>
            <div className="truncate text-xs capitalize text-slate-400">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

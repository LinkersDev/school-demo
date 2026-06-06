import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { cn } from '../../../utils/cn'
import type { MessageContact } from '../types'
import RoleBadge from './RoleBadge'

interface ParentNewMessageFlowProps {
  open: boolean
  onClose: () => void
  contacts: MessageContact[]
  contactsLoading: boolean
  onOpenChat: (userId: number) => void
}

function initials(c: Pick<MessageContact, 'first_name' | 'last_name'>): string {
  const a = (c.first_name || '?')[0] || ''
  const b = (c.last_name || '?')[0] || ''
  return (a + b).toUpperCase()
}

export default function ParentNewMessageFlow({
  open,
  onClose,
  contacts,
  contactsLoading,
  onOpenChat,
}: ParentNewMessageFlowProps) {
  const [search, setSearch] = useState('')

  const teachers = useMemo(() => contacts.filter((c) => c.role === 'teacher'), [contacts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teachers
    return teachers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.teaching_subjects ?? []).some((s) => s.toLowerCase().includes(q)),
    )
  }, [teachers, search])

  useEffect(() => {
    if (!open) return
    setSearch('')
  }, [open])

  if (!open) return null

  const shell = (c: ReactNode, opts: { title: string; onBack?: () => void }) => (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-50 md:items-center md:justify-center md:bg-black/40 md:p-4">
      <div
        className={cn(
          'flex h-full min-h-0 w-full max-w-full flex-col bg-white shadow-lg',
          'md:max-h-[min(88vh,28rem)] md:rounded-xl md:ring-1 md:ring-gray-200 md:shadow-md',
          'sm:max-w-md',
        )}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-2 py-2 sm:px-3">
          {opts.onBack ? (
            <button
              type="button"
              onClick={opts.onBack}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <span className="w-10 shrink-0" />
          )}
          <h2 className="flex-1 text-center text-sm font-semibold text-gray-900 sm:text-left">{opts.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 sm:text-sm"
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">{c}</div>
      </div>
    </div>
  )

  return shell(
    <div className="space-y-3">
      <p className="text-xs text-gray-600">
        Teachers assigned to your child&apos;s classes. Subjects they teach for your family are listed below each
        name.
      </p>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teacher…"
          className="h-9 w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-sm text-gray-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
        />
      </div>
      {contactsLoading ? (
        <p className="py-8 text-center text-xs text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-xs text-gray-500">
          {teachers.length === 0 ? 'No teachers available yet.' : 'No match.'}
        </p>
      ) : (
        <ul className="max-h-[min(52vh,18rem)] space-y-0.5 overflow-y-auto">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onOpenChat(c.id)
                  onClose()
                }}
                className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-gray-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-700">
                  {initials(c)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">{c.full_name}</div>
                  <RoleBadge role={c.role} label={c.role_display} />
                  {c.teaching_subjects && c.teaching_subjects.length > 0 ? (
                    <p className="mt-0.5 truncate text-[11px] text-teal-900/85">{c.teaching_subjects.join(' · ')}</p>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>,
    { title: 'Message a teacher' },
  )
}

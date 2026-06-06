import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, GraduationCap, Shield, Users, UserRound, Search } from 'lucide-react'
import { cn } from '../../../utils/cn'
import type { MessageContact } from '../types'
import RoleBadge from './RoleBadge'

type TeacherStep = 'kind' | 'pick-admin' | 'pick-coordinator' | 'pick-parents' | 'pick-colleagues'

interface TeacherNewMessageFlowProps {
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

export default function TeacherNewMessageFlow({
  open,
  onClose,
  contacts,
  contactsLoading,
  onOpenChat,
}: TeacherNewMessageFlowProps) {
  const [step, setStep] = useState<TeacherStep>('kind')
  const [parentSearch, setParentSearch] = useState('')
  const [colleagueSearch, setColleagueSearch] = useState('')

  const admins = useMemo(() => contacts.filter((c) => c.role === 'admin'), [contacts])
  const coordinators = useMemo(() => contacts.filter((c) => c.role === 'coordinator'), [contacts])
  const parents = useMemo(() => contacts.filter((c) => c.role === 'parent'), [contacts])
  const colleagues = useMemo(() => contacts.filter((c) => c.role === 'teacher'), [contacts])

  const filteredParents = useMemo(() => {
    const q = parentSearch.trim().toLowerCase()
    if (!q) return parents
    return parents.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)),
    )
  }, [parents, parentSearch])

  const filteredColleagues = useMemo(() => {
    const q = colleagueSearch.trim().toLowerCase()
    if (!q) return colleagues
    return colleagues.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)),
    )
  }, [colleagues, colleagueSearch])

  useEffect(() => {
    if (!open) return
    setStep('kind')
    setParentSearch('')
    setColleagueSearch('')
  }, [open])

  const openAdminChat = () => {
    if (admins.length === 1) {
      onOpenChat(admins[0].id)
      onClose()
    } else {
      setStep('pick-admin')
    }
  }

  if (!open) return null

  const shell = (c: ReactNode, opts: { title: string; onBack?: () => void }) => (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-50 md:items-center md:justify-center md:bg-black/40 md:p-4">
      <div
        className={cn(
          'flex h-full min-h-0 w-full max-w-full flex-col bg-white shadow-lg',
          'md:max-h-[min(90vh,32rem)] md:rounded-xl md:ring-1 md:ring-gray-200 md:shadow-md',
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

  const rowBtn =
    'flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-white p-3 text-left text-sm transition hover:border-teal-300 hover:bg-teal-50/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50'

  if (step === 'kind') {
    return shell(
      <div className="space-y-2">
        <p className="text-xs text-gray-600">Choose who to message — only people linked to your classes.</p>
        <button type="button" onClick={openAdminChat} disabled={contactsLoading || admins.length === 0} className={rowBtn}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <Shield className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="font-medium text-gray-900">Admin</div>
            <div className="text-[11px] text-gray-500">
              {admins.length === 0
                ? 'None listed'
                : admins.length === 1
                  ? 'Open chat'
                  : `${admins.length} admins`}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStep('pick-coordinator')}
          disabled={contactsLoading || coordinators.length === 0}
          className={rowBtn}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="font-medium text-gray-900">Coordinator</div>
            <div className="text-[11px] text-gray-500">
              {coordinators.length === 0 ? 'None available' : 'Select coordinator'}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStep('pick-parents')}
          disabled={contactsLoading || parents.length === 0}
          className={rowBtn}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
            <Users className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="font-medium text-gray-900">Parents</div>
            <div className="text-[11px] text-gray-500">
              {parents.length === 0 ? 'None for your classes' : `${parents.length} parents`}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStep('pick-colleagues')}
          disabled={contactsLoading || colleagues.length === 0}
          className={rowBtn}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="font-medium text-gray-900">Other teachers</div>
            <div className="text-[11px] text-gray-500">
              {colleagues.length === 0 ? 'No shared classes' : `${colleagues.length} on your classes`}
            </div>
          </div>
        </button>
      </div>,
      { title: 'Compose' },
    )
  }

  const contactList = (list: MessageContact[], empty: string) => {
    if (contactsLoading) {
      return <p className="py-8 text-center text-xs text-gray-500">Loading…</p>
    }
    if (list.length === 0) {
      return <p className="py-8 text-center text-xs text-gray-500">{empty}</p>
    }
    return (
      <ul className="max-h-[min(48vh,17rem)] space-y-0.5 overflow-y-auto">
        {list.map((c) => (
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
              </div>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  if (step === 'pick-admin') {
    return shell(contactList(admins, 'No administrators found.'), {
      title: 'Admin',
      onBack: () => setStep('kind'),
    })
  }

  if (step === 'pick-coordinator') {
    return shell(contactList(coordinators, 'No coordinators found.'), {
      title: 'Coordinators',
      onBack: () => setStep('kind'),
    })
  }

  if (step === 'pick-parents') {
    return shell(
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={parentSearch}
            onChange={(e) => setParentSearch(e.target.value)}
            placeholder="Search parents…"
            className="h-9 w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
          />
        </div>
        {contactList(filteredParents, 'No match.')}
      </div>,
      {
        title: 'Parents',
        onBack: () => setStep('kind'),
      },
    )
  }

  if (step === 'pick-colleagues') {
    return shell(
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={colleagueSearch}
            onChange={(e) => setColleagueSearch(e.target.value)}
            placeholder="Search teachers…"
            className="h-9 w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
          />
        </div>
        {contactList(filteredColleagues, 'No match.')}
      </div>,
      {
        title: 'Other teachers',
        onBack: () => setStep('kind'),
      },
    )
  }

  return null
}

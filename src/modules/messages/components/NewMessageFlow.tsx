import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, MessageCircle, Search, Send, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '../../../utils/cn'
import { Button } from '../../../components/ui/Button'
import api from '../../../services/api'
import type { BroadcastAudience, MessageContact } from '../types'
import RoleBadge from './RoleBadge'

type FlowStep = 'choose-type' | 'pick-recipient' | 'compose-direct' | 'pick-audience' | 'compose-broadcast'

const AUDIENCES: { id: BroadcastAudience; label: string; description: string }[] = [
  { id: 'all_staff', label: 'All staff', description: 'Admins, coordinators, and teachers' },
  { id: 'all_parents', label: 'All parents', description: 'Every parent account' },
  { id: 'teachers_only', label: 'Teachers only', description: 'Teachers (not coordinators)' },
  { id: 'coordinators_only', label: 'Coordinators only', description: 'Coordinator role only' },
]

interface NewMessageFlowProps {
  open: boolean
  onClose: () => void
  contacts: MessageContact[]
  contactsLoading: boolean
  canBroadcast: boolean
  onDirectSent: (recipientId: number) => void
}

function initials(c: Pick<MessageContact, 'first_name' | 'last_name'>): string {
  const a = (c.first_name || '?')[0] || ''
  const b = (c.last_name || '?')[0] || ''
  return (a + b).toUpperCase()
}

export default function NewMessageFlow({
  open,
  onClose,
  contacts,
  contactsLoading,
  canBroadcast,
  onDirectSent,
}: NewMessageFlowProps) {
  const qc = useQueryClient()
  const [step, setStep] = useState<FlowStep>('choose-type')
  const [search, setSearch] = useState('')
  const [recipient, setRecipient] = useState<MessageContact | null>(null)
  const [audience, setAudience] = useState<BroadcastAudience | null>(null)
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!open) return
    setStep(canBroadcast ? 'choose-type' : 'pick-recipient')
    setSearch('')
    setRecipient(null)
    setAudience(null)
    setBody('')
  }, [open, canBroadcast])

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.role_display.toLowerCase().includes(q),
    )
  }, [contacts, search])

  const sendDirect = useMutation({
    mutationFn: () =>
      api.post('/chat/messages/', { recipient: recipient!.id, body: body.trim() }),
    onSuccess: () => {
      toast.success('Message sent')
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
      qc.invalidateQueries({ queryKey: ['chat-thread', recipient!.id] })
      onDirectSent(recipient!.id)
      onClose()
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error(e.response?.data?.detail ?? 'Could not send')
    },
  })

  const sendBroadcast = useMutation({
    mutationFn: () =>
      api.post('/chat/broadcast/', { audience: audience!, body: body.trim() }),
    onSuccess: (res) => {
      const n = (res.data as { sent?: number } | undefined)?.sent ?? 0
      toast.success(n ? `Sent to ${n} recipient${n === 1 ? '' : 's'}` : 'Broadcast complete')
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
      onClose()
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error(e.response?.data?.detail ?? 'Broadcast failed')
    },
  })

  if (!open) return null

  const shell = (
    c: ReactNode,
    opts?: { title: string; onBack?: () => void; showClose?: boolean },
  ) => (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white md:items-center md:justify-center md:bg-black/45 md:p-4">
      <div
        className={cn(
          'flex h-full min-h-0 w-full flex-col bg-white shadow-xl',
          'md:h-auto md:max-h-[min(92vh,40rem)] md:min-h-0 md:rounded-2xl md:ring-1 md:ring-slate-200',
          'md:max-w-lg',
        )}
      >
        {opts ? (
          <header className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
            {opts.onBack ? (
              <button
                type="button"
                onClick={opts.onBack}
                className={cn(
                  'flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-600',
                  'hover:bg-slate-100',
                )}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <span className="w-11 shrink-0" />
            )}
            <h2 className="flex-1 text-center text-base font-semibold text-slate-900 sm:text-left">{opts.title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 min-w-11 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              Cancel
            </button>
          </header>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{c}</div>
      </div>
    </div>
  )

  if (step === 'choose-type' && canBroadcast) {
    return shell(
      <div className="space-y-3">
        <p className="text-sm text-slate-600">How would you like to reach people?</p>
        <button
          type="button"
          onClick={() => setStep('pick-recipient')}
          className={cn(
            'flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left',
            'transition hover:border-indigo-300 hover:bg-indigo-50/40 active:scale-[0.99]',
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <div className="font-semibold text-slate-900">Direct message</div>
            <div className="text-xs text-slate-500">One person · search the directory</div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStep('pick-audience')}
          className={cn(
            'flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left',
            'transition hover:border-amber-300 hover:bg-amber-50/50 active:scale-[0.99]',
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <div className="font-semibold text-slate-900">Broadcast</div>
            <div className="text-xs text-slate-500">Send the same message to a group</div>
          </div>
        </button>
      </div>,
      { title: 'New message', onBack: undefined },
    )
  }

  if (step === 'pick-recipient') {
    return shell(
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, role…"
            className="min-h-11 w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-indigo-500/30 focus:border-indigo-400 focus:ring-2"
          />
        </div>
        {contactsLoading ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading contacts…</p>
        ) : (
          <ul className="max-h-[min(50vh,22rem)] space-y-1 overflow-y-auto pr-1">
            {filteredContacts.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setRecipient(c)
                    setStep('compose-direct')
                    setBody('')
                  }}
                  className={cn(
                    'flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3 py-2 text-left',
                    'hover:bg-slate-50 active:bg-slate-100',
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                    {initials(c)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{c.full_name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <RoleBadge role={c.role} label={c.role_display} />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!contactsLoading && filteredContacts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No contacts match your search.</p>
        ) : null}
      </div>,
      {
        title: 'To:',
        onBack: canBroadcast ? () => setStep('choose-type') : undefined,
      },
    )
  }

  if (step === 'compose-direct' && recipient) {
    return shell(
      <div className="flex min-h-[12rem] flex-col gap-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Recipient</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{recipient.full_name}</span>
            <RoleBadge role={recipient.role} label={recipient.role_display} />
          </div>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message…"
          rows={5}
          className="min-h-[8rem] w-full resize-y rounded-xl border border-slate-200 p-3 text-sm text-slate-900 outline-none ring-indigo-500/25 focus:border-indigo-400 focus:ring-2"
        />
        <Button
          type="button"
          className="min-h-12 w-full gap-2"
          disabled={!body.trim() || sendDirect.isPending}
          loading={sendDirect.isPending}
          onClick={() => sendDirect.mutate()}
        >
          <Send className="h-4 w-4" />
          Send
        </Button>
      </div>,
      { title: 'Message', onBack: () => setStep('pick-recipient') },
    )
  }

  if (step === 'pick-audience') {
    return shell(
      <div className="space-y-2">
        <p className="text-sm text-slate-600">Choose who receives this broadcast.</p>
        <ul className="space-y-2">
          {AUDIENCES.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => {
                  setAudience(a.id)
                  setStep('compose-broadcast')
                  setBody('')
                }}
                className={cn(
                  'w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition',
                  'min-h-[3.5rem] hover:border-amber-400/70 hover:bg-amber-50/30 active:scale-[0.99]',
                )}
              >
                <div className="font-semibold text-slate-900">{a.label}</div>
                <div className="text-xs text-slate-500">{a.description}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>,
      { title: 'Broadcast', onBack: () => setStep('choose-type') },
    )
  }

  if (step === 'compose-broadcast' && audience) {
    const audLabel = AUDIENCES.find((x) => x.id === audience)?.label ?? audience
    return shell(
      <div className="flex min-h-[12rem] flex-col gap-4">
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-amber-900/70">Audience</div>
          <div className="mt-1 font-semibold text-amber-950">{audLabel}</div>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Broadcast message…"
          rows={5}
          className="min-h-[8rem] w-full resize-y rounded-xl border border-slate-200 p-3 text-sm text-slate-900 outline-none ring-amber-500/20 focus:border-amber-500 focus:ring-2"
        />
        <Button
          type="button"
          className="min-h-12 w-full gap-2 bg-amber-600 hover:bg-amber-700"
          disabled={!body.trim() || sendBroadcast.isPending}
          loading={sendBroadcast.isPending}
          onClick={() => sendBroadcast.mutate()}
        >
          <Send className="h-4 w-4" />
          Send broadcast
        </Button>
      </div>,
      { title: 'Compose broadcast', onBack: () => setStep('pick-audience') },
    )
  }

  return null
}

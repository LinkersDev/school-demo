import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Mail, MessageSquare, Plus, Search, Send } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { cn } from '../../../utils/cn'
import { TeacherWorkspaceShell } from '../../../components/teacher/TeacherWorkspaceShell'
import { Button } from '../../../components/ui/Button'
import api from '../../../services/api'
import { formatDateTime } from '../../../utils/format'
import toast from 'react-hot-toast'
import type { ChatMessageRow, ChatRoleFilter, ConversationSummary, MessageContact } from '../types'
import { useIsMobileMessaging } from '../hooks/useIsMobileMessaging'
import RoleBadge from '../components/RoleBadge'
import NewMessageFlow from '../components/NewMessageFlow'
import TeacherNewMessageFlow from '../components/TeacherNewMessageFlow'
import ParentNewMessageFlow from '../components/ParentNewMessageFlow'
import CompactMessagesShell from '../components/CompactMessagesShell'
import { formatMessagingRole } from '../utils/formatMessagingRole'

function initials(c: { first_name?: string; last_name?: string; full_name?: string }): string {
  if ('full_name' in c && c.full_name) {
    const p = c.full_name.trim().split(/\s+/)
    const a = p[0]?.[0] ?? ''
    const b = p[1]?.[0] ?? ''
    if (b) return (a + b).toUpperCase()
  }
  const a = ((c as MessageContact).first_name || '?')[0] || ''
  const b = ((c as MessageContact).last_name || '?')[0] || ''
  return (a + b).toUpperCase()
}

function conversationInitials(c: ConversationSummary): string {
  const p = c.full_name.trim().split(/\s+/)
  const x = p[0]?.[0] ?? '?'
  const y = p[1]?.[0] ?? ''
  return (x + y).toUpperCase()
}

export default function MessagingCenterPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const myId = user?.id
  const role = user?.role ?? ''
  const isTeacher = role === 'teacher'
  const isParent = role === 'parent'
  const isCompactPortal = isTeacher || isParent
  const canBroadcast = role === 'admin'
  const mobile = useIsMobileMessaging()

  const [search, setSearch] = useState('')
  const [chatFilter, setChatFilter] = useState<ChatRoleFilter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [newFlowOpen, setNewFlowOpen] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setChatFilter('all')
  }, [role])

  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: () => api.get<ConversationSummary[]>('/chat/conversations/').then((r) => r.data),
  })

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['message-contacts'],
    queryFn: () => api.get<MessageContact[]>('/message-contacts/').then((r) => r.data),
  })

  const filteredByRole = useMemo(() => {
    if (isParent) return conversations
    if (isTeacher) {
      if (chatFilter === 'all') return conversations
      if (chatFilter === 'staff') {
        return conversations.filter((c) => c.role === 'admin' || c.role === 'coordinator')
      }
      if (chatFilter === 'colleagues') {
        return conversations.filter((c) => c.role === 'teacher')
      }
      return conversations.filter((c) => c.role === 'parent')
    }
    if (chatFilter === 'all') return conversations
    if (chatFilter === 'teachers') return conversations.filter((c) => c.role === 'teacher')
    return conversations.filter((c) => c.role === 'parent')
  }, [conversations, chatFilter, isTeacher, isParent])

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return filteredByRole
    return filteredByRole.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.last_message_preview.toLowerCase().includes(q) ||
        c.role_display.toLowerCase().includes(q) ||
        (c.teaching_subjects ?? []).some((s) => s.toLowerCase().includes(q)),
    )
  }, [filteredByRole, search])

  const selectedConv = useMemo(
    () => (selectedId != null ? conversations.find((c) => c.user_id === selectedId) : null),
    [conversations, selectedId],
  )

  const selectedContact = useMemo(
    () => (selectedId != null ? contacts.find((c) => c.id === selectedId) : null),
    [contacts, selectedId],
  )

  const headerPerson = selectedConv
    ? {
        name: selectedConv.full_name,
        role: selectedConv.role,
        role_display: selectedConv.role_display,
        email: selectedConv.email,
        teaching_subjects: selectedConv.teaching_subjects,
      }
    : selectedContact
      ? {
          name: selectedContact.full_name,
          role: selectedContact.role,
          role_display: selectedContact.role_display,
          email: selectedContact.email,
          teaching_subjects: selectedContact.teaching_subjects,
        }
      : null

  useEffect(() => {
    if (selectedId == null) return
    const exists =
      conversations.some((c) => c.user_id === selectedId) || contacts.some((c) => c.id === selectedId)
    if (!exists) setSelectedId(null)
  }, [conversations, contacts, selectedId])

  const { data: thread = [], isFetching: threadLoading } = useQuery({
    queryKey: ['chat-thread', selectedId],
    queryFn: () =>
      api
        .get<ChatMessageRow[]>('/chat/messages/', { params: { with_user: selectedId } })
        .then((r) => r.data),
    enabled: selectedId != null,
  })

  useLayoutEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread, selectedId])

  const sendMutation = useMutation({
    mutationFn: () =>
      api.post<ChatMessageRow>('/chat/messages/', { recipient: selectedId, body: draft.trim() }),
    onSuccess: () => {
      setDraft('')
      qc.invalidateQueries({ queryKey: ['chat-thread', selectedId] })
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error(e.response?.data?.detail ?? 'Could not send message')
    },
  })

  const onSend = () => {
    if (!selectedId || !draft.trim()) return
    sendMutation.mutate()
  }

  const hideInboxOnSmall = mobile && !!selectedId
  const showThreadPanel = !!selectedId || !mobile

  const panelClass = isCompactPortal
    ? 'rounded-lg border border-gray-200 bg-white text-sm shadow-sm'
    : 'rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100/60'

  const staffSubtitle = canBroadcast
    ? 'School-wide directory, direct messages, and broadcasts.'
    : 'School messaging — direct conversations with your contacts.'

  const compactHint = isTeacher
    ? 'Staff, parents, and teachers who share your classes.'
    : "Only teachers assigned to your child's classes — subjects shown under each name."

  const openChatFromComposer = (uid: number) => {
    setSelectedId(uid)
    setNewFlowOpen(false)
    qc.invalidateQueries({ queryKey: ['chat-conversations'] })
  }

  const composeButton = isCompactPortal ? (
    <button
      type="button"
      onClick={() => setNewFlowOpen(true)}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50"
    >
      <Plus className="h-3.5 w-3.5 text-gray-700" aria-hidden />
      Compose
    </button>
  ) : (
    <Button type="button" className="min-h-11 gap-2 shadow-sm" onClick={() => setNewFlowOpen(true)}>
      <Plus className="h-4 w-4" />
      New message
    </Button>
  )

  const inboxWidth = isCompactPortal ? 'md:w-64' : 'md:w-80'
  const avatarInbox = isCompactPortal ? 'h-9 w-9 text-[10px]' : 'h-11 w-11 text-xs'
  const listMinH = isCompactPortal ? 'min-h-[3.25rem]' : 'min-h-[4rem]'

  const flowModals = (
    <>
      {isTeacher ? (
        <TeacherNewMessageFlow
          open={newFlowOpen}
          onClose={() => setNewFlowOpen(false)}
          contacts={contacts}
          contactsLoading={contactsLoading}
          onOpenChat={openChatFromComposer}
        />
      ) : isParent ? (
        <ParentNewMessageFlow
          open={newFlowOpen}
          onClose={() => setNewFlowOpen(false)}
          contacts={contacts}
          contactsLoading={contactsLoading}
          onOpenChat={openChatFromComposer}
        />
      ) : (
        <NewMessageFlow
          open={newFlowOpen}
          onClose={() => setNewFlowOpen(false)}
          contacts={contacts}
          contactsLoading={contactsLoading}
          canBroadcast={canBroadcast}
          onDirectSent={(uid) => {
            setSelectedId(uid)
            qc.invalidateQueries({ queryKey: ['chat-conversations'] })
          }}
        />
      )}
    </>
  )

  const messagingPanels = (
    <>
      {flowModals}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row',
          isCompactPortal ? 'min-h-0' : 'min-h-[50vh] md:min-h-[calc(100vh-8rem)]',
          panelClass,
        )}
      >
        <div
          className={cn(
            'flex w-full shrink-0 flex-col border-b border-gray-200 md:min-h-0 md:border-b-0 md:border-r',
            inboxWidth,
            hideInboxOnSmall ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className={cn('shrink-0 border-b border-gray-100', isCompactPortal ? 'p-2.5 sm:p-3' : 'p-4')}>
            {!isCompactPortal ? (
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                  <MessageSquare className="h-4 w-4" aria-hidden />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">Recent chats</h2>
              </div>
            ) : (
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Chats</h2>
            )}
            {!isParent ? (
              <div
                className={cn(
                  'mb-2 flex gap-0.5 rounded-lg bg-gray-100/90 p-0.5',
                  isCompactPortal && 'flex-wrap',
                )}
              >
                {(isTeacher
                  ? ([
                      ['all', 'All'],
                      ['staff', 'Staff'],
                      ['parents', 'Parents'],
                      ['colleagues', 'Teachers'],
                    ] as const)
                  : ([
                      ['all', 'All'],
                      ['teachers', 'Teachers'],
                      ['parents', 'Parents'],
                    ] as const)
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setChatFilter(id)}
                    className={cn(
                      'min-h-8 flex-1 rounded-md px-1.5 text-center text-[10px] font-semibold transition sm:min-h-9 sm:text-xs',
                      chatFilter === id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900',
                      isCompactPortal && 'min-w-[3.25rem]',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="relative">
              <Search
                className={cn(
                  'absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400',
                  isCompactPortal ? 'h-3 w-3' : 'h-3.5 w-3.5',
                )}
              />
              <input
                type="text"
                placeholder={isParent ? 'Search…' : 'Search chats…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-2 text-gray-900 outline-none placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/25',
                  isCompactPortal ? 'h-9 text-xs' : 'min-h-11 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25',
                )}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
            {convLoading && (
              <p className={cn('px-3 py-6 text-center text-gray-500', isCompactPortal ? 'text-xs' : 'text-sm')}>
                Loading…
              </p>
            )}
            {!convLoading &&
              filteredChats.map((c) => {
                const active = selectedId === c.user_id
                return (
                  <button
                    key={c.user_id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.user_id)
                      setDraft('')
                    }}
                    className={cn(
                      'flex w-full items-start gap-2 px-2 py-2 text-left transition sm:gap-3 sm:px-3 sm:py-2.5',
                      listMinH,
                      active ? 'bg-teal-50 ring-1 ring-inset ring-teal-200/60' : 'hover:bg-gray-50',
                    )}
                  >
                    <div
                      className={cn(
                        'flex shrink-0 items-center justify-center rounded-full font-bold',
                        avatarInbox,
                        active ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-800',
                      )}
                    >
                      {conversationInitials(c)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'truncate font-semibold text-gray-900',
                            isCompactPortal ? 'text-xs sm:text-sm' : 'text-sm',
                          )}
                        >
                          {c.full_name}
                        </span>
                        <RoleBadge role={c.role} label={c.role_display} />
                      </div>
                      {isParent && c.role === 'teacher' && c.teaching_subjects && c.teaching_subjects.length > 0 ? (
                        <p className="mt-0.5 truncate text-[10px] font-medium text-teal-800/90 sm:text-[11px]">
                          {c.teaching_subjects.join(' · ')}
                        </p>
                      ) : null}
                      <p
                        className={cn(
                          'mt-0.5 truncate text-gray-600',
                          isCompactPortal ? 'text-[10px] sm:text-xs' : 'text-xs',
                        )}
                      >
                        {c.last_message_preview}
                      </p>
                      {!isCompactPortal ? (
                        <p className="mt-0.5 text-[10px] text-slate-400">{formatDateTime(c.last_message_at)}</p>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            {!convLoading && filteredChats.length === 0 && (
              <div className={cn('px-3 py-10 text-center text-gray-500', isCompactPortal ? 'text-xs' : 'text-sm')}>
                <p className="font-medium text-gray-800">No chats yet</p>
                <p className="mt-1 text-gray-500">
                  {isCompactPortal ? 'Tap Compose to start.' : 'Start with "New message".'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div
          className={cn(
            'min-h-0 min-w-0 flex-1 flex-col',
            isCompactPortal ? 'bg-gray-50/50' : 'bg-gradient-to-b from-white to-slate-50/40',
            showThreadPanel ? 'flex' : 'hidden',
          )}
        >
          {selectedId && headerPerson ? (
            <>
              <div
                className={cn(
                  'shrink-0 border-b border-gray-100',
                  isCompactPortal ? 'px-2 py-2 sm:px-3' : 'px-3 py-3 sm:px-5',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {hideInboxOnSmall ? (
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
                        aria-label="Back"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                    ) : null}
                    <div
                      className={cn(
                        'flex shrink-0 items-center justify-center rounded-full font-bold text-white',
                        isCompactPortal
                          ? 'h-8 w-8 bg-teal-600 text-[11px]'
                          : 'h-11 w-11 bg-indigo-600 text-sm shadow-md',
                      )}
                    >
                      {selectedConv ? conversationInitials(selectedConv) : initials(selectedContact!)}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'truncate font-semibold text-gray-900',
                          isCompactPortal ? 'text-sm' : 'text-base',
                        )}
                      >
                        {headerPerson.name}
                      </p>
                      <div className="mt-0.5">
                        <RoleBadge role={headerPerson.role} label={headerPerson.role_display} />
                      </div>
                      {isParent &&
                      headerPerson.role === 'teacher' &&
                      headerPerson.teaching_subjects &&
                      headerPerson.teaching_subjects.length > 0 ? (
                        <p className="mt-1 truncate text-xs text-gray-600">
                          Teaches: {headerPerson.teaching_subjects.join(' · ')}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {!isCompactPortal && headerPerson.email ? (
                    <a
                      href={`mailto:${headerPerson.email}`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50 hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </a>
                  ) : null}
                </div>
              </div>

              <div className={cn('min-h-0 flex-1 space-y-2 overflow-y-auto', isCompactPortal ? 'px-2 py-2' : 'space-y-3 px-3 py-3 sm:px-5')}>
                {threadLoading && (
                  <p className="text-center text-xs text-gray-500">Loading…</p>
                )}
                {!threadLoading &&
                  thread.map((m) => (
                    <div key={m.id} className={cn('flex', m.is_mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[90%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[78%]',
                          isCompactPortal ? 'text-[13px] leading-snug' : 'px-3.5 py-2.5 text-sm',
                          m.is_mine
                            ? 'rounded-br-md bg-teal-600 text-white'
                            : 'rounded-bl-md border border-gray-200 bg-white text-gray-900',
                        )}
                      >
                        {m.is_mine && user?.full_name ? (
                          <p
                            className={cn(
                              'mb-0.5 font-semibold text-teal-100/95',
                              isCompactPortal ? 'text-[10px]' : 'text-[11px]',
                            )}
                          >
                            {user.full_name}
                            {user.role ? ` · ${formatMessagingRole(user.role)}` : ''}
                          </p>
                        ) : null}
                        {!m.is_mine && m.sender_name ? (
                          <p
                            className={cn(
                              'mb-0.5 font-semibold text-teal-800',
                              isCompactPortal ? 'text-[10px]' : 'text-[11px]',
                            )}
                          >
                            {m.sender_name}
                            {m.sender_role_display
                              ? ` · ${m.sender_role_display}`
                              : m.sender_role
                                ? ` · ${formatMessagingRole(m.sender_role)}`
                                : ''}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                        <p
                          className={cn(
                            'mt-1',
                            isCompactPortal ? 'text-[9px]' : 'text-[10px]',
                            m.is_mine ? 'text-teal-100/90' : 'text-gray-500',
                          )}
                        >
                          {formatDateTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                <div ref={threadEndRef} />
              </div>

              <div
                className={cn(
                  'shrink-0 border-t border-gray-100 bg-white',
                  isCompactPortal ? 'p-2 sm:p-2.5' : 'bg-white/95 p-3 sm:p-4',
                )}
              >
                <div className="flex gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        onSend()
                      }
                    }}
                    placeholder="Write a message…"
                    rows={isCompactPortal ? 2 : 2}
                    className={cn(
                      'min-h-[44px] flex-1 resize-y rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20',
                      isCompactPortal ? 'text-sm' : 'min-h-[48px] px-3 py-3 text-base sm:text-sm focus:border-indigo-500 focus:ring-2',
                    )}
                  />
                  {isCompactPortal ? (
                    <button
                      type="button"
                      disabled={!draft.trim() || sendMutation.isPending}
                      onClick={onSend}
                      className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-lg bg-teal-600 text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" aria-hidden />
                    </button>
                  ) : (
                    <Button
                      type="button"
                      className="min-h-12 min-w-12 shrink-0 self-end px-3 shadow-sm sm:min-w-[5rem]"
                      disabled={!draft.trim() || sendMutation.isPending}
                      loading={sendMutation.isPending}
                      onClick={onSend}
                    >
                      <Send className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Send</span>
                    </Button>
                  )}
                </div>
                {!isCompactPortal && myId != null ? (
                  <p className="mt-2 text-[10px] text-slate-400">Your messages appear on the right.</p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <MessageSquare
                className={cn('mb-2 text-gray-200', isCompactPortal ? 'h-10 w-10' : 'h-12 w-12')}
                aria-hidden
              />
              <p className={cn('font-medium text-gray-800', isCompactPortal ? 'text-xs' : 'text-sm')}>
                {isCompactPortal ? 'School messages' : 'Messaging center'}
              </p>
              <p className={cn('mt-1 text-gray-500', isCompactPortal ? 'max-w-[14rem] text-[11px]' : 'max-w-sm text-xs')}>
                {isCompactPortal ? 'Open a chat or tap Compose.' : 'Select a chat or tap New message.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )

  if (isCompactPortal) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <CompactMessagesShell title="Messages" hint={compactHint} headerAction={composeButton}>
          {messagingPanels}
        </CompactMessagesShell>
      </div>
    )
  }

  return (
    <TeacherWorkspaceShell
      variant="compact"
      title="Messages"
      subtitle={staffSubtitle}
      heroIcon={MessageSquare}
      bodyClassName="flex min-h-0 flex-1 flex-col"
      heroActions={composeButton}
    >
      {messagingPanels}
    </TeacherWorkspaceShell>
  )
}

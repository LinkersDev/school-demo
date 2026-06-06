import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { formatDateTime } from '../utils/format'
import { cn } from '../utils/cn'
import api from '../services/api'

interface Notification {
  id: number
  title: string
  body: string
  notification_type: string
  is_read: boolean
  link: string
  created_at: string
  actor?: number | null
  actor_name?: string | null
  actor_email?: string | null
}

const typeColors: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange'> = {
  lesson_plan: 'purple',
  homework: 'blue',
  attendance: 'yellow',
  grade: 'green',
  alert: 'red',
  success: 'green',
  warning: 'orange',
  info: 'blue',
}

export default function NotificationsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then(r => r.data),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', 'notifications-count'] }),
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all/'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', 'notifications-count'] }),
  })

  const notifications: Notification[] = data?.results ?? data ?? []
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-5">
      <div className="rounded-xl border border-blue-100/80 bg-gradient-to-br from-white to-blue-50/40 p-4 shadow-sm ring-1 ring-blue-100/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-blue-950 sm:text-2xl">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <Bell className="h-4 w-4" />
              </span>
              Notifications
            </h1>
            {unreadCount > 0 && <p className="mt-1 text-sm text-blue-900/70">{unreadCount} unread</p>}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="min-h-[44px] w-full shrink-0 border-blue-200 text-blue-900 hover:bg-blue-50 sm:w-auto"
              onClick={() => markAllRead.mutate()}
              loading={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      <Card className="border-blue-100/80">
        {isLoading && <CardBody><p className="text-sm text-gray-400 text-center py-6">Loading...</p></CardBody>}
        {!isLoading && notifications.length === 0 && (
          <CardBody>
            <div className="text-center py-10">
              <Bell className="w-10 h-10 mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">All caught up! No notifications.</p>
            </div>
          </CardBody>
        )}
        <div className="divide-y divide-gray-50">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => { if (!n.is_read) markRead.mutate(n.id) }}
              className={cn(
                'flex cursor-pointer gap-4 px-4 py-4 transition-colors sm:px-6',
                n.is_read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />}
                {n.is_read && <div className="w-2 h-2 rounded-full mt-1.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm', n.is_read ? 'text-gray-700' : 'font-medium text-gray-900')}>
                    {n.title}
                  </p>
                  <Badge color={typeColors[n.notification_type] ?? 'blue'}>{n.notification_type.replace('_', ' ')}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{n.body}</p>
                {n.actor_name && (
                  <p className="mt-1.5 text-[11px] text-blue-800/80">
                    From <span className="font-medium text-blue-900">{n.actor_name}</span>
                    {n.actor_email ? <span className="text-blue-700/70"> · {n.actor_email}</span> : null}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1.5">{formatDateTime(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

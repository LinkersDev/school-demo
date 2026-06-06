import { cn } from '../../utils/cn'

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange'

interface BadgeProps {
  color?: BadgeColor
  children: React.ReactNode
  className?: string
}

const colors: Record<BadgeColor, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
}

export function Badge({ color = 'blue', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colors[color], className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeColor> = {
    present: 'green', active: 'green', admin_approved: 'green', graded: 'green', submitted: 'blue',
    absent: 'red', rejected: 'red', inactive: 'red',
    late: 'yellow', pending: 'yellow', draft: 'gray',
    coordinator_approved: 'purple', excused: 'orange',
  }
  return <Badge color={map[status] ?? 'gray'}>{status.replace(/_/g, ' ')}</Badge>
}

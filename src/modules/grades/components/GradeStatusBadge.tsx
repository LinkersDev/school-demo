import { cn } from '../../../utils/cn'

export function GradeStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
    submitted: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    rejected: 'bg-red-100 text-red-800 ring-1 ring-red-200',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
        cfg[status] ?? 'bg-gray-100 text-gray-600',
      )}
    >
      {status}
    </span>
  )
}

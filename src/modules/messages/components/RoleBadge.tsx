import { cn } from '../../../utils/cn'

const ROLE_STYLES: Record<string, string> = {
  teacher: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
  parent: 'bg-violet-50 text-violet-800 ring-violet-200/80',
  admin: 'bg-amber-50 text-amber-900 ring-amber-200/80',
  coordinator: 'bg-sky-50 text-sky-900 ring-sky-200/80',
}

export default function RoleBadge({ role, label }: { role: string; label: string }) {
  const style = ROLE_STYLES[role] ?? 'bg-slate-100 text-slate-700 ring-slate-200/80'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
        style,
      )}
    >
      {label}
    </span>
  )
}

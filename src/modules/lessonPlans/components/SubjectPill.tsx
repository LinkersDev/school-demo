import type { ReactNode } from 'react'
import { cn } from '../../../utils/cn'

export interface SubjectPillProps {
  label: string
  selected?: boolean
  onClick: () => void
  size?: 'comfortable' | 'touch'
  disabled?: boolean
  leading?: ReactNode
}

export default function SubjectPill({
  label,
  selected,
  onClick,
  size = 'comfortable',
  disabled,
  leading,
}: SubjectPillProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-xl border font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-400/50 disabled:opacity-50',
        leading && 'inline-flex items-center gap-1.5',
        size === 'touch' ? 'min-h-11 px-4 py-2.5 text-sm' : 'px-3 py-1.5 text-xs sm:text-sm',
        selected
          ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-900/15'
          : 'border-indigo-200/70 bg-white/90 text-indigo-950 shadow-sm hover:border-indigo-400 hover:bg-indigo-50/80 active:scale-[0.98]',
      )}
    >
      {leading ? (
        <span className="flex items-center gap-1.5">
          {leading}
          {label}
        </span>
      ) : (
        label
      )}
    </button>
  )
}

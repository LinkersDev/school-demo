import type { ReactNode } from 'react'
import { cn } from '../../../utils/cn'

export interface ClassCardProps {
  title: string
  gradeLevel: string
  children: ReactNode
  /** Larger padding / text on small screens */
  emphasizeTouch?: boolean
}

export default function ClassCard({
  title,
  gradeLevel,
  children,
  emphasizeTouch,
}: ClassCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-white/95 to-indigo-50/40 p-4 shadow-sm shadow-indigo-900/5 backdrop-blur-sm transition hover:border-indigo-300/60 hover:shadow-md',
        emphasizeTouch && 'p-4 sm:p-4',
      )}
    >
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-indigo-950 sm:text-base">{title}</h3>
        {gradeLevel ? <p className="mt-0.5 text-xs text-indigo-700/75 sm:text-sm">{gradeLevel}</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

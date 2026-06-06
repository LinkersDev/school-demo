import type { ReactNode } from 'react'

/**
 * Minimal header for teachers/parents — intentionally smaller and plainer than the staff Messaging Center.
 */
export default function CompactMessagesShell({
  title,
  hint,
  headerAction,
  children,
}: {
  title: string
  hint?: string
  headerAction?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col px-4 py-3 sm:px-5 sm:py-4">
      <header className="mb-2 flex shrink-0 items-start justify-between gap-2 border-b border-gray-200/90 pb-2 sm:mb-3 sm:pb-3">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">{title}</h1>
          {hint ? <p className="mt-0.5 text-[11px] leading-snug text-gray-500 sm:text-xs">{hint}</p> : null}
        </div>
        {headerAction ? <div className="shrink-0 pt-0.5">{headerAction}</div> : null}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

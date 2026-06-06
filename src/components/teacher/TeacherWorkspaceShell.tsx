import type { ElementType, ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface TeacherWorkspaceShellProps {
  children: ReactNode
  /** Optional glass hero strip (title + subtitle + actions). */
  title?: string
  subtitle?: string
  heroIcon?: ElementType<{ className?: string }>
  heroActions?: ReactNode
  /** Compact hero (single-line title, tighter padding) for data-heavy pages. */
  variant?: 'default' | 'compact'
  /** Classes on the main content wrapper below the hero (e.g. flex min-h-0 for split panes). */
  bodyClassName?: string
}

export function TeacherWorkspaceShell({
  children,
  title,
  subtitle,
  heroIcon: HeroIcon,
  heroActions,
  variant = 'default',
  bodyClassName,
}: TeacherWorkspaceShellProps) {
  const showHero = Boolean(title ?? subtitle ?? heroActions)
  const compact = variant === 'compact'

  return (
    <div
      className={cn(
        'relative -m-3 overflow-x-hidden p-3 pb-6 pt-3 sm:-m-4 sm:p-4 sm:pb-8 sm:pt-4 md:-m-6 md:overflow-hidden md:p-6 md:pb-8 md:pt-6',
        compact ? 'flex min-h-[calc(100vh-4.5rem)] flex-col' : 'min-h-full',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-100/95 via-violet-50/85 to-amber-50/60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-32 left-[-10%] h-56 w-[65%] max-w-3xl rounded-full bg-teal-200/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[8%] top-1/4 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl"
        aria-hidden
      />

      <div className={cn('relative z-10 flex min-h-0 flex-1 flex-col', compact ? 'gap-3' : 'space-y-6')}>
        {showHero ? (
          <section
            className={cn(
              'relative shrink-0 overflow-hidden rounded-2xl border border-white/50 bg-white/30 shadow-md shadow-indigo-900/10 backdrop-blur-md',
              compact ? 'px-4 py-3 sm:px-5' : 'px-5 py-5 sm:px-6 sm:py-6',
            )}
          >
            <div
              className={cn(
                'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
                compact && 'sm:items-center',
              )}
            >
              <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                {HeroIcon ? (
                  <div
                    className={cn(
                      'hidden shrink-0 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-900/20 ring-2 ring-indigo-400/25 sm:flex',
                      compact ? 'p-2' : 'p-2.5',
                    )}
                  >
                    <HeroIcon className={compact ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden />
                  </div>
                ) : null}
                <div className="min-w-0">
                  {title ? (
                    <h1
                      className={cn(
                        'font-semibold tracking-tight text-indigo-950',
                        compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl',
                      )}
                    >
                      {title}
                    </h1>
                  ) : null}
                  {subtitle ? (
                    <p
                      className={cn(
                        'text-indigo-900/75',
                        compact
                          ? 'mt-0.5 line-clamp-1 text-xs sm:text-xs'
                          : 'mt-1 text-xs sm:text-sm',
                      )}
                      title={compact ? subtitle : undefined}
                    >
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>
              {heroActions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{heroActions}</div> : null}
            </div>
          </section>
        ) : null}
        <div className={cn(compact && 'flex min-h-0 flex-1 flex-col', bodyClassName)}>{children}</div>
      </div>
    </div>
  )
}

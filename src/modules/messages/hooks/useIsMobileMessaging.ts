import { useEffect, useState } from 'react'

/** Breakpoint aligned with Tailwind `md` for inbox / thread layout swap. */
export function useIsMobileMessaging() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}

import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getLastLoginEmail, hasRememberedEmailPreference } from '../lib/tabSession'
import { retrievePasswordCredential, supportsPasswordCredential } from '../lib/rememberCredentials'
import toast from 'react-hot-toast'
import { DEMO_CREDENTIALS, DEMO_PASSWORD, DEMO_USERS } from '../demo/data'
import { isDemoMode } from '../demo/env'
import {
  SCHOOL_NAME_LONG,
  SCHOOL_NAME_SHORT,
  SCHOOL_SYSTEM_LABEL,
  SCHOOL_TAGLINE,
} from '../constants/school'

// ── Left panel decorative circles ────────────────────────────────────────────
const BUBBLES = [
  { w: 340, h: 340, top: '-90px',  left: '-90px',  op: 0.07, dur: 20 },
  { w: 220, h: 220, top: '62%',    left: '-50px',  op: 0.06, dur: 24 },
  { w: 150, h: 150, top: '18%',    left: '72%',    op: 0.05, dur: 17 },
  { w: 90,  h: 90,  top: '78%',    left: '68%',    op: 0.09, dur: 21 },
  { w: 55,  h: 55,  top: '44%',    left: '82%',    op: 0.10, dur: 15 },
]

// ── Right panel floating icons (background decoration) ────────────────────────
const BG_ICONS: { path: string; top: string; left: string; size: number; delay: number; dur: number; color: string }[] = [
  {
    path: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    top: '6%', left: '84%', size: 54, delay: 0, dur: 9, color: '#2563eb',
  },
  {
    path: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222',
    top: '72%', left: '4%', size: 60, delay: 1.5, dur: 11, color: '#7c3aed',
  },
  {
    path: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    top: '20%', left: '2%', size: 46, delay: 3, dur: 8, color: '#f59e0b',
  },
  {
    path: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    top: '52%', left: '88%', size: 50, delay: 2, dur: 13, color: '#0ea5e9',
  },
  {
    path: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
    top: '86%', left: '78%', size: 42, delay: 4, dur: 10, color: '#10b981',
  },
  {
    path: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    top: '40%', left: '90%', size: 46, delay: 1, dur: 12, color: '#6366f1',
  },
  {
    path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    top: '12%', left: '5%', size: 48, delay: 2.5, dur: 14, color: '#ec4899',
  },
  {
    path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    top: '60%', left: '88%', size: 44, delay: 0.8, dur: 11, color: '#f97316',
  },
]

// ── Floating particles for right side ─────────────────────────────────────────
const DOTS = [
  { top: '10%',  left: '76%', s: 7,  d: 0,   color: '#3b82f6' },
  { top: '26%',  left: '91%', s: 5,  d: 1.2, color: '#8b5cf6' },
  { top: '63%',  left: '87%', s: 8,  d: 0.5, color: '#06b6d4' },
  { top: '80%',  left: '70%', s: 6,  d: 2.1, color: '#f59e0b' },
  { top: '46%',  left: '95%', s: 7,  d: 3.0, color: '#10b981' },
  { top: '5%',   left: '14%', s: 5,  d: 0.8, color: '#6366f1' },
  { top: '33%',  left: '6%',  s: 7,  d: 1.6, color: '#ec4899' },
  { top: '68%',  left: '10%', s: 6,  d: 2.5, color: '#3b82f6' },
  { top: '91%',  left: '24%', s: 8,  d: 0.3, color: '#7c3aed' },
  { top: '17%',  left: '48%', s: 5,  d: 3.5, color: '#0ea5e9' },
  { top: '50%',  left: '2%',  s: 6,  d: 1.1, color: '#f97316' },
  { top: '38%',  left: '93%', s: 5,  d: 2.8, color: '#10b981' },
]

// ── Component ──────────────────────────────────────────────────────────────────
function dashboardPathForRole(role: string | null | undefined): string {
  if (role === 'teacher') return '/dashboard/teacher'
  if (role === 'parent') return '/dashboard/parent'
  if (role === 'coordinator') return '/dashboard/coordinator'
  return '/dashboard/admin'
}

const LOGIN_SAMPLE_CREDENTIALS = DEMO_CREDENTIALS.filter(account =>
  isDemoMode ? account.role === 'admin' : ['admin', 'teacher', 'parent'].includes(account.role),
)

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { user, login } = useAuth()
  const navigate  = useNavigate()

  useEffect(() => {
    if (isDemoMode) {
      const admin = DEMO_USERS.find(u => u.role === 'admin')
      if (admin) {
        setEmail(admin.email)
        setPassword(DEMO_PASSWORD)
      }
      return
    }
    const prefill = getLastLoginEmail()
    if (prefill) setEmail(prefill)
    if (hasRememberedEmailPreference()) setRemember(true)
  }, [])

  if (user) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(email, password, remember)
      if (user.role === 'teacher') navigate('/dashboard/teacher')
      else if (user.role === 'parent') navigate('/dashboard/parent')
      else if (user.role === 'coordinator') navigate('/dashboard/coordinator')
      else navigate('/dashboard/admin')
    } catch {
      toast.error('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes bubble-drift {
          0%,100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-18px) scale(1.04); }
        }
        @keyframes icon-float-up {
          0%,100% { transform: translateY(0px) rotate(0deg);   opacity: 0.22; }
          50%      { transform: translateY(-22px) rotate(6deg); opacity: 0.40; }
        }
        @keyframes icon-float-down {
          0%,100% { transform: translateY(0px) rotate(0deg);    opacity: 0.22; }
          50%      { transform: translateY(22px) rotate(-6deg);  opacity: 0.40; }
        }
        @keyframes dot-pulse {
          0%,100% { opacity: 0.20; transform: scale(1);    }
          50%      { opacity: 0.70; transform: scale(1.8);  }
        }
        @keyframes panel-slide-left {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        @keyframes form-slide-right {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes card-rise {
          from { opacity: 0; transform: translateY(22px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1);       }
        }
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }

        .brand-panel  { animation: panel-slide-left  0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .form-panel   { animation: form-slide-right  0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .form-card    { animation: card-rise          0.7s  cubic-bezier(0.22,1,0.36,1) 0.1s both; }

        .login-input {
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .login-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
          outline: none;
          background: #fff;
        }
        .login-btn {
          background: #2563eb;
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .login-btn:hover:not(:disabled) {
          background: #1d4ed8;
          box-shadow: 0 6px 24px rgba(37,99,235,0.38);
          transform: translateY(-1px);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .spin { animation: spin 0.75s linear infinite; }

        /* Placeholder colour */
        .login-input::placeholder { color: #9ca3af; }
      `}</style>

      <div className="min-h-screen flex">

        {/* ═══════════════════════════
            LEFT  —  Brand panel
        ═══════════════════════════ */}
        <div
          className="brand-panel hidden lg:flex lg:w-[46%] xl:w-[44%] flex-col items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #0f2260 0%, #1a3fa8 55%, #1e56c8 100%)' }}
        >
          {/* Decorative circles */}
          {BUBBLES.map((b, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white pointer-events-none"
              style={{
                width: b.w, height: b.h,
                top: b.top, left: b.left,
                opacity: b.op,
                animation: `bubble-drift ${b.dur}s ease-in-out infinite ${i * 2.2}s`,
              }}
            />
          ))}

          {/* Dot grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* ── Centred logo ── */}
          <div className="relative z-10 flex flex-col items-center gap-6 px-10 text-center">
            {/* Book icon */}
            <div
              className="rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                width: 160, height: 160,
                background: 'rgba(255,255,255,0.10)',
                boxShadow: '0 12px 48px rgba(0,0,0,0.35)',
                border: '2px solid rgba(255,255,255,0.20)',
              }}
            >
              <svg width="88" height="88" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>

            {/* School name */}
            <div>
              <h1 className="text-white font-bold text-2xl leading-tight">
                {SCHOOL_NAME_SHORT}
              </h1>
              <p className="text-sm mt-1 font-medium tracking-widest uppercase"
                style={{ color: 'rgba(180,205,255,0.75)' }}>
                School Portal
              </p>
            </div>

            {/* Tag line */}
            <p className="text-sm leading-relaxed max-w-xs"
              style={{ color: 'rgba(200,218,255,0.70)' }}>
              {SCHOOL_TAGLINE}
            </p>

            {/* Gold pill */}
            <div
              className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full"
              style={{
                background: 'rgba(245,158,11,0.18)',
                color: '#fbbf24',
                border: '1px solid rgba(245,158,11,0.30)',
              }}
            >
              {SCHOOL_SYSTEM_LABEL}
            </div>
          </div>

          {/* Copyright */}
          <p
            className="absolute bottom-5 text-xs"
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            © 2026 {SCHOOL_NAME_LONG}
          </p>
        </div>

        {/* ═══════════════════════════
            RIGHT  —  Form panel
        ═══════════════════════════ */}
        <div
          className="form-panel flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden"
          style={{ background: '#f8faff' }}
        >
          {/* ── Floating school icons (background decoration) ── */}
          {BG_ICONS.map((ic, i) => (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{
                top: ic.top, left: ic.left,
                animation: `${i % 2 === 0 ? 'icon-float-up' : 'icon-float-down'} ${ic.dur}s ease-in-out infinite ${ic.delay}s`,
              }}
            >
              <svg
                width={ic.size} height={ic.size}
                viewBox="0 0 24 24" fill="none"
                stroke={ic.color} strokeWidth={1.6}
                strokeLinecap="round" strokeLinejoin="round"
                style={{ opacity: 0.28 }}
              >
                <path d={ic.path} />
              </svg>
            </div>
          ))}

          {/* ── Twinkling dots ── */}
          {DOTS.map((d, i) => (
            <div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                top: d.top, left: d.left,
                width: d.s, height: d.s,
                background: d.color,
                animation: `dot-pulse ${2.5 + (i % 4) * 0.4}s ease-in-out infinite ${d.d}s`,
              }}
            />
          ))}

          {/* ── Soft gradient blobs ── */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: '-10%', right: '-8%',
              width: 320, height: 320,
              background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
              filter: 'blur(40px)',
              animation: 'bubble-drift 18s ease-in-out infinite',
            }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              bottom: '-12%', left: '-6%',
              width: 280, height: 280,
              background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
              filter: 'blur(50px)',
              animation: 'bubble-drift 22s ease-in-out infinite 4s',
            }}
          />

          {/* ── The form card ── */}
          <div className="form-card relative z-10 w-full max-w-sm">

            {/* Mobile-only icon */}
            <div className="flex lg:hidden flex-col items-center gap-3 mb-8">
              <div
                className="rounded-2xl flex items-center justify-center"
                style={{
                  width: 72, height: 72,
                  background: 'linear-gradient(135deg, #1a3fa8, #2563eb)',
                  boxShadow: '0 4px 16px rgba(37,99,235,0.30)',
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-sm text-center">
                {SCHOOL_NAME_LONG}
              </span>
            </div>

            {/* Heading */}
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-sm text-gray-500">Sign in to your account to continue</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 0l-8 8-8-8" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@school.edu"
                    className="login-input w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="login-input w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {supportsPasswordCredential() ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const cred = await retrievePasswordCredential()
                      if (cred) {
                        setEmail(cred.email)
                        setPassword(cred.password)
                        toast.success('Filled from browser')
                      } else {
                        toast.error('No saved password for this site')
                      }
                    }}
                    className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Use saved browser password
                  </button>
                ) : null}
              </div>

              {/* Remember me */}
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex-shrink-0" style={{ width: 18, height: 18 }}>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className="rounded transition-all duration-200"
                      style={{
                        width: 18, height: 18,
                        border: `2px solid ${remember ? '#2563eb' : '#d1d5db'}`,
                        background: remember ? '#2563eb' : '#fff',
                      }}
                    >
                      {remember && (
                        <svg className="absolute inset-0 m-auto" width="10" height="10"
                          viewBox="0 0 12 10" fill="none" stroke="white"
                          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1,5 4.5,8.5 11,1" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 select-none group-hover:text-gray-800 transition-colors">
                    Remember me
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="login-btn w-full text-white py-3.5 rounded-xl font-semibold text-sm tracking-wide disabled:opacity-55 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2.5"
              >
                {loading ? (
                  <>
                    <svg className="spin w-4 h-4 opacity-80" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-xs text-blue-950 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold">Login accounts</p>
                <span className="rounded-full bg-white px-2 py-0.5 font-medium text-blue-700">
                  Password: {DEMO_PASSWORD}
                </span>
              </div>
              <div className="space-y-1.5">
                {LOGIN_SAMPLE_CREDENTIALS.map(account => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setEmail(account.email)
                      setPassword(account.password)
                    }}
                    className="flex w-full items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-left transition hover:bg-white"
                  >
                    <span className="font-medium capitalize">{account.role}</span>
                    <span className="font-mono text-[11px] text-blue-700">
                      {account.email} / {account.password}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getLandingPath } from '../../utils/constants'
import { getAvailableFacilities } from '../../services/facilityService'
import toast from 'react-hot-toast'

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
)

const HospitalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6v4" /><path d="M14 14h-4" /><path d="M14 18h-4" /><path d="M14 8h-4" />
    <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" />
    <path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18" />
  </svg>
)

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [facilities, setFacilities] = useState([])

  useEffect(() => {
    getAvailableFacilities().then(setFacilities).catch(() => {})
  }, [])

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('يرجى ملء جميع الحقول'); return }
    setLoading(true)
    try {
      const { role, facilityId } = await login(form.email, form.password)
      toast.success('تم تسجيل الدخول بنجاح')
      navigate(getLandingPath(role, facilityId), { replace: true })
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      } else if (err.code === 'auth/user-not-found') {
        toast.error('لا يوجد حساب بهذا البريد الإلكتروني')
      } else {
        toast.error('حدث خطأ، يرجى المحاولة مرة أخرى')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ direction: 'ltr' }}>

      {/* ── Left: Login form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white">

        {/* Mobile logo */}
        <div className="mb-8 md:hidden">
          <img src="/logo.png" alt="logo" className="h-14 object-contain mx-auto" />
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sign in</h1>
            <p className="mt-1 text-sm text-gray-500">Enter your credentials to access the system</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="name@example.com"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Signing in…</>
                : 'Sign in'}
            </button>
          </form>

          {/* Mobile facilities */}
          {facilities.length > 0 && (
            <div className="mt-10 md:hidden">
              <div className="relative flex items-center gap-3 text-xs text-gray-400 before:flex-1 before:border-t before:border-gray-200 after:flex-1 after:border-t after:border-gray-200">
                Partner facilities
              </div>
              <div className="mt-3 flex flex-wrap gap-2 justify-center">
                {facilities.map((f) => (
                  <div
                    key={f.id}
                    title={f.name}
                    className="h-11 w-11 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden"
                  >
                    {(f.logoUrl || f.imageUrl)
                      ? <img src={f.logoUrl || f.imageUrl} alt={f.name} className="h-full w-full object-contain p-1" />
                      : <span className="text-gray-400"><HospitalIcon /></span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-10 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} Medical Booking System
          </p>
        </div>
      </div>

      {/* ── Right: Branding panel ── */}
      <div
        className="hidden md:flex w-[45%] flex-col items-center justify-center px-12 py-16 gap-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1e40af 0%, #1d4ed8 45%, #0369a1 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/4 h-40 w-40 rounded-full bg-white/5" />

        {/* Logo + text */}
        <div className="relative z-10 text-center">
          <img src="/logo.png" alt="logo" className="h-20 object-contain mx-auto mb-6 brightness-0 invert" />
          <h2 className="text-3xl font-extrabold text-white leading-snug">
            منظومة الحجز الطبي
          </h2>
          <p className="mt-2 text-blue-200 text-sm leading-relaxed max-w-xs mx-auto">
            نظام متكامل لإدارة مواعيد المرضى وربط المنشآت الصحية
          </p>
        </div>

        {/* Facilities */}
        {facilities.length > 0 && (
          <div className="relative z-10 w-full max-w-xs">
            <div className="border-t border-white/20 mb-5" />
            <p className="text-center text-xs uppercase tracking-widest text-blue-200 mb-4">
              المنشآت المتعاقدة
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {facilities.map((f) => (
                <div
                  key={f.id}
                  title={f.name}
                  className="group h-16 w-16 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden transition hover:bg-white/20 hover:scale-105 cursor-default"
                >
                  {(f.logoUrl || f.imageUrl)
                    ? <img src={f.logoUrl || f.imageUrl} alt={f.name} className="h-full w-full object-contain p-1.5" />
                    : <span className="text-white/60"><HospitalIcon /></span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats strip */}
        <div className="relative z-10 w-full max-w-xs">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'المنشآت', value: facilities.length || '—' },
              { label: 'الخدمة', value: '24/7' },
              { label: 'الحجوزات', value: '∞' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-white/10 border border-white/15 p-3 text-center">
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-[10px] text-blue-200 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

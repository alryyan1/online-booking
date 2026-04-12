import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ROLES } from '../../utils/constants'
import toast from 'react-hot-toast'
import Spinner from '../../components/common/Spinner'

const Login = () => {
  const { login, userRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/'

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.identifier || !form.password) {
      toast.error('يرجى ملء جميع الحقول')
      return
    }
    setLoading(true)
    try {
      await login(form.identifier, form.password)
      toast.success('تم تسجيل الدخول بنجاح')
      // Navigation will be handled by GuestRoute + auth state
      navigate(from, { replace: true })
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        toast.error('البريد الإلكتروني/اسم المستخدم أو كلمة المرور غير صحيحة')
      } else if (err.code === 'auth/user-not-found') {
        toast.error('لا يوجد حساب بهذا البريد الإلكتروني أو اسم المستخدم')
      } else {
        toast.error('حدث خطأ، يرجى المحاولة مرة أخرى')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏥</div>
          <h1 className="text-2xl font-bold text-gray-800">تسجيل الدخول</h1>
          <p className="text-gray-500 text-sm mt-1">مرحباً بك في منظومة الحجز الطبي</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              البريد الإلكتروني أو اسم المستخدم
            </label>
            <input
              type="text"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
              placeholder="example@email.com or username"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              كلمة المرور
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Spinner size="sm" /> : null}
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login

import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ROLES } from '../../utils/constants'
import toast from 'react-hot-toast'

const Navbar = () => {
  const { currentUser, userRole, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
      toast.success('تم تسجيل الخروج بنجاح')
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الخروج')
    }
  }

  const getDashboardLink = () => {
    if (userRole === ROLES.SUPER_ADMIN) return '/superadmin/dashboard'
    if (userRole === ROLES.FACILITY_ADMIN) return '/admin/dashboard'
    return '/my-appointments'
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-blue-700 font-bold text-xl">
          <span className="text-2xl">🏥</span>
          <span>حجز طبي</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/" className="text-gray-600 hover:text-blue-700 font-medium transition">
            الرئيسية
          </Link>

          {currentUser ? (
            <>
              <Link
                to={getDashboardLink()}
                className="text-gray-600 hover:text-blue-700 font-medium transition"
              >
                لوحة التحكم
              </Link>
              {userRole === ROLES.PATIENT && (
                <Link to="/my-appointments" className="text-gray-600 hover:text-blue-700 font-medium transition">
                  مواعيدي
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-100 transition text-sm font-medium"
              >
                تسجيل الخروج
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-blue-700 font-medium transition">
                تسجيل الدخول
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                إنشاء حساب
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-gray-600 text-2xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t px-4 py-3 flex flex-col gap-3">
          <Link to="/" onClick={() => setMenuOpen(false)} className="text-gray-700 hover:text-blue-700">
            الرئيسية
          </Link>
          {currentUser ? (
            <>
              <Link to={getDashboardLink()} onClick={() => setMenuOpen(false)} className="text-gray-700">
                لوحة التحكم
              </Link>
              {userRole === ROLES.PATIENT && (
                <Link to="/my-appointments" onClick={() => setMenuOpen(false)} className="text-gray-700">
                  مواعيدي
                </Link>
              )}
              <button onClick={handleLogout} className="text-red-600 text-right">
                تسجيل الخروج
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="text-gray-700">
                تسجيل الدخول
              </Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="text-blue-600 font-medium">
                إنشاء حساب
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar

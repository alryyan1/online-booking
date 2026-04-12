import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'

const CallCenterDashboard = () => {
  const { facilityId } = useAuth()

  const stats = [
    { label: 'حجز اليوم', icon: '⚡', link: '/callcenter/book-today', color: 'bg-red-500' },
    { label: 'حجز موعد جديد', icon: '➕', link: '/callcenter/book', color: 'bg-blue-500' },
    { label: 'المواعيد', icon: '📅', link: '/callcenter/appointments', color: 'bg-green-500' },
    { label: 'جدول الأطباء', icon: '👨‍⚕️', link: '/callcenter/schedule', color: 'bg-purple-500' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">لوحة تحكم كول سنتر</h1>
        <p className="text-gray-500">مرحباً بك، يمكنك إدارة المواعيد والحجوزات من هنا.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.link}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group"
          >
            <div className={`w-12 h-12 ${stat.color} text-white rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition`}>
              {stat.icon}
            </div>
            <h2 className="text-lg font-semibold text-gray-800">{stat.label}</h2>
            <p className="text-sm text-gray-500 mt-1">انتقل إلى صفحة {stat.label}</p>
          </Link>
        ))}
      </div>


    </div>

  )
}

export default CallCenterDashboard

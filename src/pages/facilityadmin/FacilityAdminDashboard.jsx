import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getFacilityById } from '../../services/facilityService'
import { getCentralDoctors } from '../../services/doctorService'
import { getAppointments } from '../../services/appointmentService'
import { APPOINTMENT_STATUS } from '../../utils/constants'
import Spinner from '../../components/common/Spinner'

const FacilityAdminDashboard = () => {
  const { facilityId } = useAuth()
  const [facility, setFacility] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!facilityId) return
    Promise.all([
      getFacilityById(facilityId),
      getCentralDoctors(),
      getAppointments(facilityId),
    ]).then(([f, d, a]) => {
      setFacility(f)
      setDoctors(d)
      setAppointments(a)
      setLoading(false)
    })
  }, [facilityId])

  if (loading) return <Spinner size="lg" className="py-32" />

  const pending = appointments.filter((a) => a.status === APPOINTMENT_STATUS.PENDING).length
  const confirmed = appointments.filter((a) => a.status === APPOINTMENT_STATUS.CONFIRMED).length
  const canceled = appointments.filter((a) => a.status === APPOINTMENT_STATUS.CANCELED).length

  const stats = [
    { label: 'إجمالي الأطباء', value: doctors.length, icon: '👨‍⚕️', color: 'bg-blue-50 text-blue-700', link: '/admin/doctors' },
    { label: 'قيد الانتظار', value: pending, icon: '⏳', color: 'bg-yellow-50 text-yellow-700', link: '/admin/appointments' },
    { label: 'مواعيد مؤكدة', value: confirmed, icon: '✅', color: 'bg-green-50 text-green-700', link: '/admin/appointments' },
    { label: 'مواعيد ملغاة', value: canceled, icon: '❌', color: 'bg-red-50 text-red-700', link: '/admin/appointments' },
  ]

  const recentAppointments = appointments.slice(0, 5)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم — {facility?.name}</h1>
        <p className="text-gray-500 text-sm mt-1">{facility?.address}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <Link key={s.label} to={s.link} className={`${s.color} rounded-2xl p-5 hover:opacity-90 transition`}>
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-xs font-medium mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Link
          to="/admin/doctors"
          className="bg-blue-600 text-white rounded-2xl p-5 hover:bg-blue-700 transition text-center"
        >
          <div className="text-3xl mb-2">👨‍⚕️</div>
          <div className="font-medium">إدارة الأطباء</div>
        </Link>
        <Link
          to="/admin/appointments"
          className="bg-green-600 text-white rounded-2xl p-5 hover:bg-green-700 transition text-center"
        >
          <div className="text-3xl mb-2">📅</div>
          <div className="font-medium">إدارة المواعيد</div>
        </Link>
        <Link
          to="/admin/facility"
          className="bg-purple-600 text-white rounded-2xl p-5 hover:bg-purple-700 transition text-center"
        >
          <div className="text-3xl mb-2">🏥</div>
          <div className="font-medium">معلومات المرفق</div>
        </Link>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-800">آخر المواعيد</h2>
          <Link to="/admin/appointments" className="text-blue-600 text-sm hover:underline">
            عرض الكل
          </Link>
        </div>
        {recentAppointments.length === 0 ? (
          <p className="text-center text-gray-400 py-10">لا توجد مواعيد بعد</p>
        ) : (
          <div className="divide-y">
            {recentAppointments.map((appt) => (
              <div key={appt.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{appt.doctorName}</p>
                  <p className="text-xs text-gray-500">{appt.date} — {appt.timeSlot}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                  ${appt.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                    : appt.status === 'confirmed' ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'}`}>
                  {appt.status === 'pending' ? 'انتظار' : appt.status === 'confirmed' ? 'مؤكد' : 'ملغي'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FacilityAdminDashboard

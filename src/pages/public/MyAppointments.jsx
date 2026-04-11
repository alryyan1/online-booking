import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFacilities } from '../../contexts/FacilityContext'
import { getPatientAppointments, updateAppointmentStatus } from '../../services/appointmentService'
import AppointmentStatusBadge from '../../components/appointment/AppointmentStatusBadge'
import Spinner from '../../components/common/Spinner'
import { formatDateArabic } from '../../utils/dateHelpers'
import { APPOINTMENT_STATUS } from '../../utils/constants'
import toast from 'react-hot-toast'

const MyAppointments = () => {
  const { currentUser } = useAuth()
  const { facilities } = useFacilities()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!currentUser || facilities.length === 0) return
    setLoading(true)
    const all = await Promise.all(
      facilities.map((f) => getPatientAppointments(f.id, currentUser.uid))
    )
    setAppointments(all.flat().sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [currentUser, facilities])

  const handleCancel = async (facilityId, appointmentId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء الموعد؟')) return
    try {
      await updateAppointmentStatus(facilityId, appointmentId, APPOINTMENT_STATUS.CANCELED)
      toast.success('تم إلغاء الموعد')
      load()
    } catch {
      toast.error('حدث خطأ أثناء الإلغاء')
    }
  }

  if (loading) return <Spinner size="lg" className="py-32" />

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">مواعيدي</h1>

      {appointments.length === 0 ? (
        <div className="text-center text-gray-400 py-20 bg-white rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-lg">لا توجد مواعيد محجوزة</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div key={appt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-800">{appt.doctorName}</h3>
                    <AppointmentStatusBadge status={appt.status} />
                  </div>
                  <p className="text-sm text-gray-500 mb-1">🏥 {appt.facilityName}</p>
                  <p className="text-sm text-gray-500 mb-1">
                    📅 {formatDateArabic(appt.date)}
                  </p>
                  <p className="text-sm text-gray-500" dir="ltr">⏰ {appt.timeSlot}</p>
                  {appt.insurance && (
                    <p className="text-sm text-gray-500 mt-1">🛡 {appt.insurance}</p>
                  )}
                </div>
                {appt.status === APPOINTMENT_STATUS.PENDING && (
                  <button
                    onClick={() => handleCancel(appt.facilityId, appt.id)}
                    className="text-sm text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-50 transition"
                  >
                    إلغاء الموعد
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyAppointments

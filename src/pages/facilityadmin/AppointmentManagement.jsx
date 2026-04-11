import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useAppointments } from '../../hooks/useAppointments'
import { updateAppointmentStatus, deleteAppointment } from '../../services/appointmentService'
import AppointmentStatusBadge from '../../components/appointment/AppointmentStatusBadge'
import Spinner from '../../components/common/Spinner'
import { APPOINTMENT_STATUS } from '../../utils/constants'
import { formatDateArabic } from '../../utils/dateHelpers'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'انتظار' },
  { key: 'confirmed', label: 'مؤكد' },
  { key: 'canceled', label: 'ملغي' },
]

const AppointmentManagement = () => {
  const { facilityId } = useAuth()
  const { appointments, loading, refetch } = useAppointments(facilityId)
  const [activeTab, setActiveTab] = useState('all')

  const filtered = activeTab === 'all'
    ? appointments
    : appointments.filter((a) => a.status === activeTab)

  const handleStatus = async (appt, status) => {
    try {
      await updateAppointmentStatus(facilityId, appt.id, status)
      toast.success(
        status === APPOINTMENT_STATUS.CONFIRMED ? 'تم تأكيد الموعد' : 'تم إلغاء الموعد'
      )
      refetch()
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const handleDelete = async (appt) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموعد؟')) return
    try {
      await deleteAppointment(facilityId, appt.id)
      toast.success('تم حذف الموعد')
      refetch()
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const counts = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    canceled: appointments.filter((a) => a.status === 'canceled').length,
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">إدارة المواعيد</h1>
        <p className="text-gray-500 text-sm mt-1">{appointments.length} موعد إجمالي</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition
              ${activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs
              ${activeTab === tab.key ? 'bg-white/20' : 'bg-gray-100'}`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-20 bg-white rounded-2xl shadow-sm">
          <div className="text-5xl mb-4">📅</div>
          <p>لا توجد مواعيد في هذا القسم</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-right">
                <tr>
                  <th className="px-5 py-3 font-medium">الطبيب</th>
                  <th className="px-5 py-3 font-medium">التاريخ والوقت</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">التأمين</th>
                  <th className="px-5 py-3 font-medium">الحالة</th>
                  <th className="px-5 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">{appt.doctorName}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[150px]">{appt.patientEmail}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-gray-700">{formatDateArabic(appt.date)}</p>
                      <p className="text-xs text-gray-500" dir="ltr">{appt.timeSlot}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">
                      {appt.insurance || '-'}
                    </td>
                    <td className="px-5 py-4">
                      <AppointmentStatusBadge status={appt.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {appt.status === APPOINTMENT_STATUS.PENDING && (
                          <>
                            <button
                              onClick={() => handleStatus(appt, APPOINTMENT_STATUS.CONFIRMED)}
                              className="text-xs text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-50 transition"
                            >
                              تأكيد
                            </button>
                            <button
                              onClick={() => handleStatus(appt, APPOINTMENT_STATUS.CANCELED)}
                              className="text-xs text-red-500 border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition"
                            >
                              إلغاء
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(appt)}
                          className="text-xs text-gray-400 hover:text-red-500 transition"
                          title="حذف"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppointmentManagement

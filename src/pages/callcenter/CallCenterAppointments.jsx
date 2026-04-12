import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getAppointments } from '../../services/appointmentService'
import { formatDate } from '../../utils/bookingUtils'
import AppointmentStatusBadge from '../../components/appointment/AppointmentStatusBadge'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const CallCenterAppointments = () => {
  const { facilityId } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')

  // Filter states
  const [patientSearch, setPatientSearch] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('all') // 'all', 'morning', 'evening'

  const todayStr = formatDate(new Date())

  useEffect(() => {
    if (!facilityId) {
      setLoading(false)
      return
    }

    getAppointments(facilityId)
      .then(setAppointments)
      .catch((err) => {
        console.error(err)
        toast.error('حدث خطأ أثناء تحميل المواعيد')
      })
      .finally(() => setLoading(false))
  }, [facilityId])

  // Multi-step filtering
  const filteredAppointments = appointments.filter((apt) => {
    // 1. Tab Filter
    if (activeTab === 'today' && apt.date !== todayStr) return false

    // 2. Date Filter (Custom)
    if (dateFilter && apt.date !== dateFilter) return false

    // 3. Period Filter
    if (periodFilter !== 'all' && apt.period !== periodFilter) return false

    // 4. Patient Search
    if (patientSearch.trim()) {
      const search = patientSearch.toLowerCase()
      const matchesPatient = apt.patientName?.toLowerCase().includes(search)
      const matchesPhone = apt.patientPhone?.includes(search)
      if (!matchesPatient && !matchesPhone) return false
    }

    // 5. Doctor/Spec Search
    if (doctorSearch.trim()) {
      const search = doctorSearch.toLowerCase()
      const matchesDoctor = apt.doctorName?.toLowerCase().includes(search)
      const matchesSpec = apt.specializationName?.toLowerCase().includes(search)
      if (!matchesDoctor && !matchesSpec) return false
    }

    return true
  })

  // Counts for the summary
  const counts = {
    today: appointments.filter(apt => apt.date === todayStr).length,
    all: appointments.length,
    filtered: filteredAppointments.length
  }

  const clearFilters = () => {
    setPatientSearch('')
    setDoctorSearch('')
    setDateFilter('')
    setPeriodFilter('all')
  }

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-10 text-right">
        <h1 className="text-2xl font-black text-gray-800">إدارة المواعيد</h1>
        <p className="text-gray-500 mt-1">تتبع وعرض وتحليل المواعيد المسجلة.</p>
      </header>

      {/* Filter Toolbar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-8 space-y-6 text-right">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">

          {/* Tab Switcher */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-full lg:w-fit flex-row-reverse">
            <button
              onClick={() => { setActiveTab('today'); setDateFilter('') }}
              className={`flex-1 lg:px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'today' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              مواعيد اليوم ({counts.today})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 lg:px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              جميع المواعيد ({counts.all})
            </button>
          </div>

          {/* Search & Date Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:flex-1 lg:justify-end flex-wrap">
            {/* Patient Search */}
            <div className="relative sm:flex-1 w-full group">
              <input
                type="text"
                placeholder="ابحث باسم المريض أو الهاتف..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full text-right bg-gray-50 border-2 border-gray-50 rounded-2xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors text-xs">👤</span>
            </div>

            {/* Doctor Search */}
            <div className="relative sm:flex-1 w-full group">
              <input
                type="text"
                placeholder="ابحث باسم الطبيب أو التخصص..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full text-right bg-gray-50 border-2 border-gray-50 rounded-2xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors text-xs">👨‍⚕️</span>
            </div>

            {/* Period Filter Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-full sm:w-auto flex-row-reverse">
              <button
                onClick={() => setPeriodFilter('all')}
                className={`flex-1 sm:px-4 py-2 rounded-xl text-[10px] font-black transition-all ${periodFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                الكل
              </button>
              <button
                onClick={() => setPeriodFilter('morning')}
                className={`flex-1 sm:px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 justify-center ${periodFilter === 'morning' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <span className="text-[12px]">☀️</span>
                <span>صباحاً</span>
              </button>
              <button
                onClick={() => setPeriodFilter('evening')}
                className={`flex-1 sm:px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 justify-center ${periodFilter === 'evening' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <span className="text-[12px]">🌙</span>
                <span>مساءً</span>
              </button>
            </div>

            {/* Date Filter */}
            <div className="relative w-full sm:w-auto group">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value)
                  if (e.target.value) setActiveTab('all')
                }}
                className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-bold text-gray-700"
              />
            </div>

            {/* Reset Button */}
            {(patientSearch || doctorSearch || dateFilter || periodFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="bg-red-50 text-red-500 px-4 py-2.5 rounded-2xl text-xs font-black hover:bg-red-100 transition-colors"
              >
                X
              </button>
            )}
          </div>
        </div>

        {/* Results summary bar */}
        {(patientSearch || doctorSearch || dateFilter || periodFilter !== 'all') && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            <span className="text-xs font-bold text-gray-400">نتائج البحث: <span className="text-blue-600">{counts.filtered}</span> موعد</span>
            <div className="flex gap-2">
              {periodFilter !== 'all' && (
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${periodFilter === 'morning' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                  {periodFilter === 'morning' ? '☀️ صباحاً' : '🌙 مساءً'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="text-center text-gray-400 py-32 bg-white rounded-3xl border-2 border-dashed border-gray-100 shadow-sm transition-all">
          <div className="text-6xl mb-4 opacity-10">🔎</div>
          <p className="text-xl font-bold">لا توجد نتائج تطابق بحثك</p>
          {(patientSearch || doctorSearch || dateFilter) && (
            <button onClick={clearFilters} className="mt-4 text-blue-600 font-bold hover:underline">عرض جميع المواعيد ←</button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-right">المريض / الهاتف</th>
                  <th className="px-6 py-5 font-black text-[10px] uppercase tracking-widest hidden sm:table-cell text-right">الطبيب / التخصص</th>
                  <th className="px-6 py-5 font-black text-[10px] uppercase tracking-widest hidden md:table-cell text-right">التاريخ</th>
                  <th className="px-6 py-5 font-black text-[10px] uppercase tracking-widest hidden md:table-cell text-right">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-blue-50/20 transition-all group">
                    <td className="px-6 py-5 text-right">
                      <div className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{apt.patientName || '-'}</div>
                      <div className="text-xs text-blue-500 font-medium mt-1" dir="ltr">{apt.patientPhone || '-'}</div>
                    </td>
                    <td className="px-6 py-5 hidden sm:table-cell text-right">
                      <div className="font-bold text-gray-700">{apt.doctorName || '-'}</div>
                      <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase leading-none">{apt.specializationName || '-'}</div>
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell text-right">
                      <div className={`px-4 py-1.5 rounded-xl text-[11px] font-black inline-block ${apt.date === todayStr ? 'bg-red-50 text-red-600 ring-1 ring-red-100 shadow-sm' : 'bg-gray-50 text-gray-600'}`} dir="ltr">
                        {apt.date || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell text-right">
                      <div className="flex flex-col items-start gap-2">
                        <span className={`px-3 py-0.5 rounded text-[8px] font-black uppercase ${apt.period === 'morning' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                          {apt.period === 'morning' ? 'صباحاً' : apt.period === 'evening' ? 'مساءً' : '-'}
                        </span>
                        <span className="font-black text-gray-900 text-xs" dir="ltr">{apt.time || apt.timeSlot || '-'}</span>
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

export default CallCenterAppointments

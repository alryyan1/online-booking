import { useEffect, useState, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { updateAppointmentStatus } from '../../services/appointmentService'
import { sendSMS, sendCancelWhatsApp, buildCancelMessage } from '../../services/notificationService'
import { formatDate } from '../../utils/bookingUtils'
import { APPOINTMENT_STATUS, COLLECTIONS } from '../../utils/constants'
import { Sun, Moon, Ban, Search, X, CalendarDays, Phone, Stethoscope } from 'lucide-react'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'
import { cn } from '../../lib/utils'

const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })
const timeAgo = (date) => {
  const secs = Math.round((date - Date.now()) / 1000)
  const abs = Math.abs(secs)
  if (abs < 60)    return rtf.format(Math.round(secs), 'second')
  if (abs < 3600)  return rtf.format(Math.round(secs / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), 'hour')
  return rtf.format(Math.round(secs / 86400), 'day')
}

const STATUS_MAP = {
  [APPOINTMENT_STATUS.PENDING]:   { label: 'قيد الانتظار', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  [APPOINTMENT_STATUS.CONFIRMED]: { label: 'مؤكد',         cls: 'bg-green-100 text-green-700 border-green-200' },
  [APPOINTMENT_STATUS.CANCELED]:  { label: 'ملغي',         cls: 'bg-red-100 text-red-700 border-red-200' },
  [APPOINTMENT_STATUS.COMPLETED]: { label: 'مكتمل',        cls: 'bg-blue-100 text-blue-700 border-blue-200' },
}

const REALTIME_LIMIT = 150

export default function CallCenterAppointments() {
  const { facilityId } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState(null)
  const [activeTab, setActiveTab] = useState('today')
  const [patientSearch, setPatientSearch] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('all')
  const initializedRef = useRef(false)

  const todayStr = formatDate(new Date())

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }

    const q = query(
      collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS),
      orderBy('createdAt', 'desc'),
      limit(REALTIME_LIMIT)
    )

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

      if (!initializedRef.current) {
        initializedRef.current = true
        setAppointments(docs)
        setLoading(false)
        return
      }

      setAppointments((prev) => {
        const prevIds = new Set(prev.map((a) => a.id))
        const added = docs.filter((d) => !prevIds.has(d.id))
        if (added.length > 0) {
          toast.success(added.length === 1 ? 'حجز جديد وصل' : `${added.length} حجوزات جديدة`, { icon: '📅' })
        }
        return docs
      })
    }, (err) => {
      console.error(err)
      toast.error('حدث خطأ في الاتصال')
      setLoading(false)
    })

    return unsub
  }, [facilityId])

  const handleCancel = async (id) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) return
    const aptData = appointments.find((a) => a.id === id)
    setCancelingId(id)
    try {
      await updateAppointmentStatus(facilityId, id, APPOINTMENT_STATUS.CANCELED)
      toast.success('تم إلغاء الحجز')
      if (aptData) {
        Promise.all([
          sendSMS(aptData.patientPhone, buildCancelMessage({
            patientName: aptData.patientName,
            doctorName: aptData.doctorName,
            date: aptData.date,
            shift: aptData.period,
          })),
          sendCancelWhatsApp({
            phone: aptData.patientPhone,
            patientName: aptData.patientName,
            doctorName: aptData.doctorName,
            date: aptData.date,
            shift: aptData.period,
          }),
        ]).catch((err) => console.error('Cancellation notification error:', err))
      }
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء إلغاء الحجز')
    } finally {
      setCancelingId(null)
    }
  }

  const filtered = appointments.filter((apt) => {
    if (activeTab === 'today' && apt.date !== todayStr) return false
    if (dateFilter && apt.date !== dateFilter) return false
    if (periodFilter !== 'all' && apt.period !== periodFilter) return false
    if (patientSearch.trim()) {
      const s = patientSearch.toLowerCase()
      if (!apt.patientName?.toLowerCase().includes(s) && !apt.patientPhone?.includes(s)) return false
    }
    if (doctorSearch.trim()) {
      const s = doctorSearch.toLowerCase()
      if (!apt.doctorName?.toLowerCase().includes(s) && !apt.specializationName?.toLowerCase().includes(s)) return false
    }
    return true
  })

  const todayCount = appointments.filter((a) => a.date === todayStr).length
  const hasFilters = patientSearch || doctorSearch || dateFilter || periodFilter !== 'all'
  const clearFilters = () => { setPatientSearch(''); setDoctorSearch(''); setDateFilter(''); setPeriodFilter('all') }

  if (loading) return <Spinner size="lg" />

  return (
    <div className="max-w-6xl mx-auto px-3 py-4" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-base font-bold text-gray-900 leading-tight">إدارة المواعيد</h1>
          <p className="text-xs text-gray-500">تتبع وإدارة المواعيد المسجلة • تحديث فوري</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            اليوم: {todayCount}
          </span>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            الإجمالي: {appointments.length}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            مباشر
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-3 rounded-lg border border-gray-200 bg-white p-2.5 flex flex-wrap items-center gap-2">

        {/* Today / All toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 shrink-0">
          {[{ key: 'today', label: 'اليوم' }, { key: 'all', label: 'الكل' }].map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); if (t.key === 'today') setDateFilter('') }}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                activeTab === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200 hidden md:block" />

        {/* Patient search */}
        <div className="relative flex-1 min-w-36">
          <Search className="absolute center-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            placeholder="المريض أو الهاتف..."
            className="w-full rounded-md border border-gray-200 bg-gray-50 pr-7 pl-2.5 py-1.5 text-xs outline-none focus:border-blue-400 focus:bg-white"
          />
        </div>

        {/* Doctor search */}
        <div className="relative flex-1 min-w-36">
          <Stethoscope className="absolute center-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            value={doctorSearch}
            onChange={(e) => setDoctorSearch(e.target.value)}
            placeholder="الطبيب أو التخصص..."
            className="w-full rounded-md border border-gray-200 bg-gray-50 pr-7 pl-2.5 py-1.5 text-xs outline-none focus:border-blue-400 focus:bg-white"
          />
        </div>

        {/* Period filter */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 shrink-0">
          {[
            { key: 'all', label: 'الكل', icon: null },
            { key: 'morning', label: 'ص', icon: <Sun className="h-3 w-3" /> },
            { key: 'evening', label: 'م', icon: <Moon className="h-3 w-3" /> },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodFilter(p.key)}
              className={cn(
                'flex items-center gap-0.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                periodFilter === p.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {p.icon}{p.label}
            </button>
          ))}
        </div>

        {/* Date picker */}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); if (e.target.value) setActiveTab('all') }}
          className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-blue-400 focus:bg-white w-36"
          dir="ltr"
        />

        {hasFilters && (
          <button onClick={clearFilters} className="text-red-500 hover:text-red-700 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {hasFilters && (
        <p className="text-[11px] text-gray-400 mb-2 px-1">{filtered.length} نتيجة</p>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
          <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">لا توجد مواعيد تطابق بحثك</p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-2 text-xs text-blue-500 hover:underline">عرض الكل</button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-center text-center text-[11px] font-semibold text-gray-500 w-8">#</th>
                  <th className="text-center text-center text-[11px] font-semibold text-gray-500">المريض</th>
                  <th className="text-center text-center text-[11px] font-semibold text-gray-500 w-24">الهاتف</th>
                  <th className="text-center text-center text-[11px] font-semibold text-gray-500 hidden sm:table-cell">الطبيب / التخصص</th>
                  <th className="text-center text-center text-[11px] font-semibold text-gray-500 hidden md:table-cell">التاريخ</th>
                  <th className="text-center text-center text-[11px] font-semibold text-gray-500 hidden md:table-cell">الفترة</th>
                  <th className="text-center text-center text-[11px] font-semibold text-gray-500 hidden lg:table-cell">وقت التسجيل</th>
                  <th className="text-center text-center text-[11px] font-semibold text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((apt, idx) => {
                  const isCanceled = apt.status === APPOINTMENT_STATUS.CANCELED
                  const isToday = apt.date === todayStr
                  const st = STATUS_MAP[apt.status] ?? { label: apt.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
                  return (
                    <tr
                      key={apt.id}
                      className={cn('hover:bg-gray-50 transition-colors', isCanceled && 'opacity-50')}
                    >
                      <td className="py-2 px-3">
                        <span className="text-[11px] text-gray-400 font-semibold">{idx + 1}</span>
                      </td>

                      <td className="py-2 px-3">
                        <p className="text-sm font-bold text-gray-900 leading-tight">{apt.patientName || '—'}</p>
                     
                      </td>
                      <td>   {apt.patientPhone && (
                          <p className="text-[11px] text-blue-600 mt-0.5 flex items-center gap-0.5" dir="ltr">
                            <Phone className="h-2.5 w-2.5" />{apt.patientPhone}
                          </p>
                        )}</td>

                      <td className="text-center hidden sm:table-cell">
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{apt.doctorName || '—'}</p>
                        <p className="text-[11px] text-gray-400">{apt.specializationName || ''}</p>
                      </td>

                      <td className="text-center hidden md:table-cell">
                        <span className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold border',
                          isToday
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        )}>
                          {apt.date || '—'}
                        </span>
                      </td>

                      <td className="text-center hidden md:table-cell">
                        {apt.period === 'morning' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            <Sun className="h-3 w-3" />صباحاً
                          </span>
                        )}
                        {apt.period === 'evening' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                            <Moon className="h-3 w-3" />مساءً
                          </span>
                        )}
                        {!apt.period && <span className="text-gray-300 text-xs">—</span>}
                      </td>

                      <td className="text-center hidden lg:table-cell">
                        {apt.createdAt ? (() => {
                          const d = apt.createdAt.toDate ? apt.createdAt.toDate() : new Date(apt.createdAt)
                          return (
                            <div dir="ltr">
                              <p className="text-[11px] font-semibold text-gray-700">{d.toLocaleDateString('ar-EG')}</p>
                              <p className="text-[10px] text-gray-500">{d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                              <p className="text-[10px] text-gray-400">{timeAgo(d)}</p>
                            </div>
                          )
                        })() : <span className="text-gray-300 text-xs">—</span>}
                      </td>

                      <td className="text-center text-center">
                        {isCanceled ? (
                          <span className={cn('inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold', st.cls)}>
                            {st.label}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCancel(apt.id)}
                            disabled={cancelingId === apt.id}
                            title="إلغاء الحجز"
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40"
                          >
                            <Ban className="h-3 w-3" />
                            {cancelingId === apt.id ? '...' : 'إلغاء'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-3 py-1.5">
            <span className="text-[11px] text-gray-500">
              محمّل: <strong className="text-gray-800">{appointments.length}</strong> موعد
              {appointments.length >= REALTIME_LIMIT && (
                <span className="text-gray-400"> (آخر {REALTIME_LIMIT})</span>
              )}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              تحديث تلقائي
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

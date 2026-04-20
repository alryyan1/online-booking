import { useEffect, useState, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { getSpecializations, getDoctorsBySpec } from '../../services/facilityService'
import { getBookedSlots, createCallCenterAppointment } from '../../services/appointmentService'
import { getAvailableBookingDays, categorizeSlotsByShift } from '../../utils/bookingUtils'
import { APPOINTMENT_STATUS, COLLECTIONS } from '../../utils/constants'
import { Search, X, Stethoscope, User, CalendarDays, Sun, Moon, Phone } from 'lucide-react'

const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })
const timeAgo = (ts) => {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const secs = Math.round((d - Date.now()) / 1000)
  const abs = Math.abs(secs)
  if (abs < 60)    return rtf.format(Math.round(secs), 'second')
  if (abs < 3600)  return rtf.format(Math.round(secs / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), 'hour')
  return rtf.format(Math.round(secs / 86400), 'day')
}
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function CallCenterBookNow() {
  const { facilityId } = useAuth()
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedSpec, setSelectedSpec] = useState(null)
  const [docSelectedDates, setDocSelectedDates] = useState({})
  const [selectedShift, setSelectedShift] = useState(null)
  const [selectedDayRender, setSelectedDayRender] = useState(null)

  const [showFormModal, setShowFormModal] = useState(false)
  const [showDatePickerModal, setShowDatePickerModal] = useState(false)
  const [doctorForDatePick, setDoctorForDatePick] = useState(null)
  const [patientData, setPatientData] = useState({ name: '', phone: '' })
  const [isBooking, setIsBooking] = useState(false)

  const [bookedCounts, setBookedCounts] = useState({})
  const [loadingCounts, setLoadingCounts] = useState(false)
  const knownAptIdsRef = useRef(new Set())
  const specialtiesRef = useRef([])
  const docSelectedDatesRef = useRef({})

  const [showPatientList, setShowPatientList] = useState(false)
  const [listDoctor, setListDoctor] = useState(null)
  const [listDate, setListDate] = useState('')
  const [listAppointments, setListAppointments] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [listTab, setListTab] = useState('morning')

  const loadData = async () => {
    if (!facilityId) { setLoading(false); return }
    setLoading(true)
    try {
      const allSpecs = await getSpecializations(facilityId)
      const activeSpecs = allSpecs.filter((s) => s.isActive !== false)
      const initialDateMap = {}
      const specData = await Promise.all(
        activeSpecs.map(async (spec) => {
          const doctors = await getDoctorsBySpec(facilityId, spec.id)
          const availableDocs = doctors
            .filter((d) => d.isActive !== false && d.isBookingEnabled !== false)
            .map((d) => {
              const availableDays = getAvailableBookingDays(d)
              const earliest = availableDays.length > 0 ? availableDays[0] : null
              if (earliest) initialDateMap[d.id] = earliest
              return { ...d, availableDays, earliestDate: earliest?.date || '9999-99-99' }
            })
            .sort((a, b) => a.earliestDate.localeCompare(b.earliestDate))
          return { ...spec, doctors: availableDocs }
        })
      )
      const finalSpecs = specData.filter((s) => s.doctors.length > 0)
      setSpecialties(finalSpecs)
      setDocSelectedDates(initialDateMap)
      Object.entries(initialDateMap).forEach(([docId, day]) => {
        const doctor = finalSpecs.flatMap((s) => s.doctors).find((d) => d.id === docId)
        if (doctor) fetchCounts(doctor, day)
      })
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء تحميل البيانات') }
    setLoading(false)
  }

  // Keep refs in sync for use inside snapshot callback (avoids stale closures)
  useEffect(() => { specialtiesRef.current = specialties }, [specialties])
  useEffect(() => { docSelectedDatesRef.current = docSelectedDates }, [docSelectedDates])

  useEffect(() => { loadData() }, [facilityId])

  const fetchCounts = async (doctor, day) => {
    const key = `${doctor.id}_${day.date}`
    if (bookedCounts[key]) return
    setLoadingCounts(true)
    try {
      const slots = await getBookedSlots(facilityId, doctor.id, day.date)
      const counts = categorizeSlotsByShift(slots, doctor.workingSchedule?.[day.dayName])
      setBookedCounts((prev) => ({ ...prev, [key]: counts }))
    } catch (err) { console.error(err) }
    setLoadingCounts(false)
  }

  const refreshCounts = async (doctor, day) => {
    if (!doctor || !day) return
    try {
      const slots = await getBookedSlots(facilityId, doctor.id, day.date)
      const counts = categorizeSlotsByShift(slots, doctor.workingSchedule?.[day.dayName])
      setBookedCounts((prev) => ({ ...prev, [`${doctor.id}_${day.date}`]: counts }))
    } catch (err) { console.error(err) }
  }

  // Realtime listener — updates counts when a new appointment is saved
  useEffect(() => {
    if (!facilityId) return
    const q = query(
      collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const unsub = onSnapshot(q, (snap) => {
      const newOnes = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d) => !knownAptIdsRef.current.has(d.id))

      if (newOnes.length === 0) {
        // seed on first load
        snap.docs.forEach((d) => knownAptIdsRef.current.add(d.id))
        return
      }

      newOnes.forEach((apt) => {
        knownAptIdsRef.current.add(apt.id)
        // Find the doctor in the current specialties list
        const allDocs = specialtiesRef.current.flatMap((s) => s.doctors)
        const doctor = allDocs.find((d) => d.id === apt.doctorId)
        if (!doctor) return
        const day = docSelectedDatesRef.current[doctor.id]
        if (day && day.date === apt.date) {
          refreshCounts(doctor, day)
          toast.success(`حجز جديد — ${apt.patientName || ''}`, { icon: '📅' })
        }
      })
    })
    return unsub
  }, [facilityId])

  const handleOpenPatientList = async (doctor, tab = 'morning') => {
    const activeDay = docSelectedDates[doctor.id]
    if (!activeDay) { toast.error('يرجى اختيار تاريخ أولاً'); return }
    setListDoctor(doctor); setListDate(activeDay.date)
    setListAppointments([]); setListTab(tab)
    setShowPatientList(true); setLoadingList(true)
    try {
      const slots = await getBookedSlots(facilityId, doctor.id, activeDay.date)
      const active = slots
        .filter((s) => s.status !== APPOINTMENT_STATUS.CANCELED)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setListAppointments(active)
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء تحميل كشف الحجز') }
    setLoadingList(false)
  }

  const handleDaySelect = (doctor, day) => {
    setDocSelectedDates((prev) => ({ ...prev, [doctor.id]: day }))
    fetchCounts(doctor, day)
  }

  const handleShiftSelect = (doctor, spec, day, shift) => {
    setSelectedDoctor(doctor); setSelectedSpec(spec)
    setSelectedDayRender(day); setSelectedShift(shift)
    setShowFormModal(true)
  }

  const handleConfirmBooking = async (e) => {
    e.preventDefault()
    if (!patientData.name.trim() || !patientData.phone.trim()) { toast.error('يرجى إدخال اسم المريض ورقم الهاتف'); return }
    setIsBooking(true)
    try {
      await createCallCenterAppointment(facilityId, {
        centralSpecialtyId: selectedSpec.id, specializationName: selectedSpec.specName,
        doctorId: selectedDoctor.id, doctorName: selectedDoctor.docName, facilityId,
        date: selectedDayRender.date, period: selectedShift.type, time: selectedShift.start,
        patientName: patientData.name.trim(), patientPhone: patientData.phone.trim(),
      })
      toast.success('تم حجز الموعد بنجاح')
      const key = `${selectedDoctor.id}_${selectedDayRender.date}`
      const slots = await getBookedSlots(facilityId, selectedDoctor.id, selectedDayRender.date)
      const counts = categorizeSlotsByShift(slots, selectedDoctor.workingSchedule?.[selectedDayRender.dayName])
      setBookedCounts((prev) => ({ ...prev, [key]: counts }))
      setShowFormModal(false); setPatientData({ name: '', phone: '' })
      setSelectedDoctor(null); setSelectedDayRender(null); setSelectedShift(null)
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء إتمام الحجز') }
    finally { setIsBooking(false) }
  }

  const filteredSpecialties = specialties.map((spec) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return spec
    const filteredDoctors = spec.doctors.filter((d) => d.docName.toLowerCase().includes(term))
    if (spec.specName.toLowerCase().includes(term)) return spec
    if (filteredDoctors.length > 0) return { ...spec, doctors: filteredDoctors }
    return null
  }).filter(Boolean)

  if (loading) return <Spinner size="lg" />

  // ── Shift cell ──────────────────────────────────────────────────────────────
  const ShiftCell = ({ doc, spec, activeDay, shiftType }) => {
    const shift = activeDay?.shifts.find((s) => s.type === shiftType)
    const countsKey = activeDay ? `${doc.id}_${activeDay.date}` : ''
    const counts = bookedCounts[countsKey] || { morning: 0, evening: 0 }
    const hasCounts = !!bookedCounts[countsKey]
    const limit = doc[shiftType + 'PatientLimit'] || 0
    const booked = counts[shiftType] || 0
    const isFull = limit > 0 && booked >= limit
    const Icon = shiftType === 'morning' ? Sun : Moon
    const iconCls = shiftType === 'morning' ? 'text-amber-400' : 'text-indigo-400'

    if (!shift) return (
      <td className="px-3 py-2 text-center">
        <span className="text-xs text-gray-300">غير متاح</span>
      </td>
    )

    return (
      <td className="px-3 py-2 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <Icon className={cn('h-3 w-3', iconCls)} />
            <span className="text-xs font-bold text-gray-700" dir="ltr">{shift.start}</span>
          </div>
          <button
            onClick={() => handleOpenPatientList(doc, shiftType)}
            title="عرض الكشف"
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums transition hover:opacity-75 cursor-pointer',
              isFull ? 'border-red-200 bg-red-50 text-red-600'
                : hasCounts ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-gray-50 text-gray-400'
            )}
          >
            {hasCounts ? `${booked}/${limit}` : '—/—'}
          </button>
          <button
            disabled={isFull || (!hasCounts && loadingCounts)}
            onClick={() => handleShiftSelect(doc, spec, activeDay, shift)}
            className={cn(
              'rounded px-3 cursor-pointer py-0.5 text-xs font-bold transition',
              isFull
                ? 'border border-red-200 text-red-400 cursor-not-allowed opacity-60'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 disabled:opacity-50'
            )}
          >
            {isFull ? 'مغلق' : 'حجز'}
          </button>
        </div>
      </td>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 md:px-6">

      {/* ── Header ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">حجز موعد جديد</h1>
          <p className="text-xs text-gray-400">اختر الطبيب والتاريخ المناسب للمريض</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الطبيب أو التخصص..."
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pr-8 pl-7 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Empty states ── */}
      {specialties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <Stethoscope className="mb-3 h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-400">لا يوجد أطباء متاحون للحجز حالياً</p>
        </div>
      ) : filteredSpecialties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <p className="text-sm text-gray-400">لا توجد نتائج تطابق "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')} className="mt-2 text-xs text-blue-600 hover:underline">عرض الكل</button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredSpecialties.map((spec) => (
            <div key={spec.id}>
              {/* Specialty header */}
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {spec.specName.charAt(0)}
                </div>
                <h2 className="text-sm font-bold text-gray-800">{spec.specName}</h2>
                <div className="flex-1 border-t border-gray-100" />
                <span className="text-xs text-gray-400">{spec.doctors.length} أطباء</span>
              </div>

              {/* Doctors table */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                        <th className="px-3 py-2 text-right">الطبيب</th>
                        <th className="px-3 py-2 text-center">التاريخ</th>
                        <th className="px-3 py-2 text-center">
                          <span className="flex items-center justify-center gap-1">
                            <Sun className="h-3 w-3 text-amber-400" /> صباحاً
                          </span>
                        </th>
                        <th className="px-3 py-2 text-center">
                          <span className="flex items-center justify-center gap-1">
                            <Moon className="h-3 w-3 text-indigo-400" /> مساءً
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {spec.doctors.map((doc) => {
                        const activeDay = docSelectedDates[doc.id]
                        return (
                          <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                            {/* Doctor info */}
                            <td className="px-3 py-2">
                              <button
                                onClick={() => handleOpenPatientList(doc)}
                                className="flex items-center gap-2 text-right hover:opacity-70 transition"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 overflow-hidden">
                                  {doc.photoUrl
                                    ? <img src={doc.photoUrl} alt={doc.docName} className="h-full w-full object-cover" />
                                    : <User className="h-4 w-4 text-blue-400" />}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-900">{doc.docName}</p>
                                  <p className="text-[11px] text-gray-400">{doc.phoneNumber || '—'}</p>
                                </div>
                              </button>
                            </td>

                            {/* Date picker */}
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => { setDoctorForDatePick(doc); setShowDatePickerModal(true) }}
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition"
                              >
                                <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                                {activeDay
                                  ? <span>{activeDay.dayName} {activeDay.date.split('-').reverse().slice(0, 2).join('/')}</span>
                                  : <span className="text-gray-400">اختر تاريخاً</span>}
                              </button>
                            </td>

                            <ShiftCell doc={doc} spec={spec} activeDay={activeDay} shiftType="morning" />
                            <ShiftCell doc={doc} spec={spec} activeDay={activeDay} shiftType="evening" />
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Booking Form Modal ── */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={`حجز موعد — د. ${selectedDoctor?.docName}`} size="2xl">
        <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold text-blue-700 mb-0.5">الموعد المحدد</p>
            <p className="text-sm font-bold text-gray-900">{selectedDayRender?.dayName}، {selectedDayRender?.date}</p>
            <p className="text-xs text-blue-600">الفترة: {selectedShift?.label}</p>
          </div>
          <span className="text-xl font-bold text-blue-700" dir="ltr">{selectedShift?.start}</span>
        </div>
        <form onSubmit={handleConfirmBooking} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">اسم المريض الكامل</label>
            <input
              autoFocus required
              value={patientData.name}
              onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
              placeholder="الاسم الرباعي"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">رقم الهاتف</label>
            <input
              required type="tel" dir="ltr"
              value={patientData.phone}
              onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
              placeholder="09XXXXXXXX"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowFormModal(false)}
              className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              إلغاء
            </button>
            <button type="submit" disabled={isBooking}
              className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-60">
              {isBooking && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {isBooking ? 'جاري الحفظ...' : 'تأكيد الحجز'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Date Picker Modal ── */}
      <Modal isOpen={showDatePickerModal} onClose={() => setShowDatePickerModal(false)} title={`اختيار التاريخ — د. ${doctorForDatePick?.docName}`} size="sm">
        <div className="grid grid-cols-3 gap-2 pb-1 sm:grid-cols-4">
          {doctorForDatePick?.availableDays.map((day) => {
            const isSelected = docSelectedDates[doctorForDatePick.id]?.date === day.date
            return (
              <button
                key={day.date}
                onClick={() => { handleDaySelect(doctorForDatePick, day); setShowDatePickerModal(false) }}
                className={cn(
                  'flex flex-col items-center rounded-lg border px-2 py-2.5 text-center transition',
                  isSelected
                    ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                )}
              >
                <span className={cn('text-[11px] font-semibold', isSelected ? 'text-blue-100' : 'text-gray-500')}>
                  {day.dayName}
                </span>
                <span className="text-sm font-bold">
                  {day.date.split('-').reverse().slice(0, 2).join('/')}
                </span>
                {isSelected && (
                  <span className="mt-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    مختار
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Modal>

      {/* ── Patient List Modal ── */}
      <Modal isOpen={showPatientList} onClose={() => setShowPatientList(false)} title={`كشف د. ${listDoctor?.docName} — ${listDate}`} size="lg">
        {loadingList ? (
          <Spinner size="md" />
        ) : (
          <div>
            <div className="mb-3 flex rounded-lg border border-gray-100 bg-gray-50 p-0.5">
              {[
                { key: 'morning', label: 'صباحاً', icon: Sun },
                { key: 'evening', label: 'مساءً', icon: Moon },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setListTab(key)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition',
                    listTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {(() => {
              const sectionAppts = listAppointments.filter((a) => a.period === listTab)
              if (!sectionAppts.length) return (
                <div className="py-10 text-center text-sm text-gray-400">لا يوجد حجوزات لهذه الفترة</div>
              )
              return (
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500">
                        <th className="px-2 py-2 text-right w-7">#</th>
                        <th className="px-2 py-2 text-right">الاسم</th>
                        <th className="px-2 py-2 text-right">الهاتف</th>
                        <th className="px-2 py-2 text-center">الوقت</th>
                        <th className="px-2 py-2 text-center">تاريخ الحجز</th>
                        <th className="px-2 py-2 text-center">منذ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sectionAppts.map((appt, idx) => {
                        const createdAt = appt.createdAt?.toDate ? appt.createdAt.toDate() : appt.createdAt ? new Date(appt.createdAt) : null
                        return (
                          <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-2 py-1.5 text-gray-300 font-bold text-center">{idx + 1}</td>
                            <td className="px-2 py-1.5 font-bold text-gray-900 whitespace-nowrap">{appt.patientName}</td>
                            <td className="px-2 py-1.5 text-blue-600 whitespace-nowrap" dir="ltr">
                              <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{appt.patientPhone || '—'}</span>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-bold text-blue-700" dir="ltr">
                                {appt.time || appt.timeSlot || '—'}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-center text-gray-500 whitespace-nowrap" dir="ltr">
                              {createdAt
                                ? `${createdAt.toLocaleDateString('ar-EG')} ${createdAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
                                : '—'}
                            </td>
                            <td className="px-2 py-1.5 text-center text-gray-400 whitespace-nowrap">
                              {timeAgo(appt.createdAt)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        )}
      </Modal>
    </div>
  )
}

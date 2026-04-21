import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getSpecializations, getDoctorsBySpec } from '../../services/facilityService'
import { getBookedSlots, createCallCenterAppointment, updateAppointmentStatus } from '../../services/appointmentService'
import { sendSMS, sendWhatsApp, sendCancelWhatsApp, buildBookingMessage, buildCancelMessage } from '../../services/notificationService'
import { getWorkingShifts, getDayName, formatDate, categorizeSlotsByShift } from '../../utils/bookingUtils'
import { APPOINTMENT_STATUS } from '../../utils/constants'
import { Search, X, Stethoscope, Zap, Sun, Moon } from 'lucide-react'
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import ZoomableAvatar from '../../components/common/ZoomableAvatar'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

interface Doctor {
  id: string;
  docName: string;
  phoneNumber?: string;
  photoUrl?: string;
  isActive?: boolean;
  isBookingEnabled?: boolean;
  workingSchedule?: Record<string, any>;
  morningPatientLimit?: number;
  eveningPatientLimit?: number;
  [key: string]: any;
}

interface Specialty {
  id: string;
  specName: string;
  isActive?: boolean;
  doctors: Doctor[];
}

interface Appointment {
  id: string;
  patientName?: string;
  patientPhone?: string;
  date?: string;
  period?: 'morning' | 'evening' | string;
  time?: string;
  timeSlot?: string;
  createdAt?: any;
  status?: string;
  [key: string]: any;
}

interface Shift {
  type: 'morning' | 'evening';
  start: string;
  end: string;
  label: string;
}

const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })
const timeAgo = (ts: any): string => {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const secs = Math.round((d.getTime() - Date.now()) / 1000)
  const abs = Math.abs(secs)
  if (abs < 60)    return rtf.format(Math.round(secs), 'second')
  if (abs < 3600)  return rtf.format(Math.round(secs / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), 'hour')
  return rtf.format(Math.round(secs / 86400), 'day')
}

const CallCenterBookToday = () => {
  const { facilityId, currentUser } = useAuth() as any
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')

  const today = new Date()
  const todayDate = formatDate(today)
  const todayDayName = getDayName(today)

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedSpec, setSelectedSpec] = useState<Specialty | null>(null)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [showFormModal, setShowFormModal] = useState<boolean>(false)
  const [patientData, setPatientData] = useState({ name: '', phone: '' })
  const [isBooking, setIsBooking] = useState<boolean>(false)
  const [bookedCounts, setBookedCounts] = useState<Record<string, { morning?: number, evening?: number }>>({})

  const [showPatientList, setShowPatientList] = useState<boolean>(false)
  const [listDoctor, setListDoctor] = useState<Doctor | null>(null)
  const [listAppointments, setListAppointments] = useState<Appointment[]>([])
  const [loadingList, setLoadingList] = useState<boolean>(false)
  const [listTab, setListTab] = useState<string>('morning')
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  const loadData = async () => {
    if (!facilityId) { setLoading(false); return }
    setLoading(true)
    try {
      const allSpecs = await getSpecializations(facilityId)
      const activeSpecs = allSpecs.filter((s: any) => s.isActive !== false)
      const specData = await Promise.all(
        activeSpecs.map(async (spec: any) => {
          const doctors = await getDoctorsBySpec(facilityId, spec.id)
          const workingToday = doctors
            .filter((d: any) => d.isActive !== false && d.isBookingEnabled !== false)
            .filter((d: any) => getWorkingShifts(d, today) !== null)
          return { ...spec, doctors: workingToday }
        })
      )
      const specsWithDoctors = specData.filter((s) => s.doctors.length > 0)
      setSpecialties(specsWithDoctors)
      specsWithDoctors.forEach((spec) => spec.doctors.forEach((doc: Doctor) => fetchDoctorCounts(doc)))
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء تحميل البيانات') }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [facilityId])

  const fetchDoctorCounts = async (doctor: Doctor) => {
    if (bookedCounts[doctor.id]) return
    try {
      const slots = await getBookedSlots(facilityId, doctor.id, todayDate)
      const counts = categorizeSlotsByShift(slots, doctor.workingSchedule?.[todayDayName])
      setBookedCounts((prev) => ({ ...prev, [doctor.id]: counts }))
    } catch (err) { console.error(err) }
  }

  const handleOpenPatientList = async (doctor: Doctor, tab: string = 'morning') => {
    setListDoctor(doctor)
    setListAppointments([])
    setListTab(tab)
    setShowPatientList(true)
    setLoadingList(true)
    try {
      const slots = await getBookedSlots(facilityId, doctor.id, todayDate)
      const active = slots
        .filter((s: any) => s.status !== APPOINTMENT_STATUS.CANCELED)
        .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setListAppointments(active)
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء تحميل كشف الحجز') }
    setLoadingList(false)
  }

  const handleCancelAppointment = async (appt: Appointment) => {
    setCancelingId(appt.id)
    try {
      await updateAppointmentStatus(facilityId, appt.id, APPOINTMENT_STATUS.CANCELED)
      setListAppointments((prev) => prev.filter((a) => a.id !== appt.id))
      toast.success('تم إلغاء الحجز')
      const phone = appt.patientPhone || ''
      const date = appt.date || todayDate
      const period = appt.period
      
      console.log(`[UI] Triggering notifications for cancellation:`, { phone, patient: appt.patientName, period })

      const [smsResult, waResult] = await Promise.all([
        sendSMS(phone, buildCancelMessage({ 
          patientName: appt.patientName, 
          doctorName: listDoctor?.docName || '', 
          date, 
          shift: period 
        })),
        sendCancelWhatsApp({ 
          phone, 
          patientName: appt.patientName, 
          doctorName: listDoctor?.docName || '', 
          date, 
          shift: period 
        }),
      ])
      if (smsResult.ok) toast.success('تم إرسال SMS الإلغاء')
      else toast.error(`فشل SMS: ${smsResult.error}`)
      if (waResult.ok) toast.success('تم إرسال واتساب الإلغاء')
      else toast.error(`فشل واتساب: ${waResult.error}`)
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء الإلغاء') }
    setCancelingId(null)
  }

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientData.name.trim() || !patientData.phone.trim()) { toast.error('يرجى إدخال اسم المريض ورقم الهاتف'); return }
    if (!selectedSpec || !selectedDoctor || !selectedShift) return;
    
    setIsBooking(true)
    try {
      await createCallCenterAppointment(facilityId, {
        centralSpecialtyId: selectedSpec.id, specializationName: selectedSpec.specName,
        doctorId: selectedDoctor.id, doctorName: selectedDoctor.docName, facilityId,
        date: todayDate, period: selectedShift.type, time: selectedShift.start,
        patientName: patientData.name.trim(), patientPhone: patientData.phone.trim(),
        createdById: currentUser?.uid || null,
        createdByName: currentUser?.displayName || currentUser?.email || 'Unknown',
      })
      toast.success('تم حجز الموعد بنجاح')
      const message = buildBookingMessage({
        patientName: patientData.name.trim(), doctorName: selectedDoctor.docName,
        specialtyName: selectedSpec.specName, date: todayDate,
        time: selectedShift.start, shift: selectedShift.label,
      })
      const phone = patientData.phone.trim()
      const [smsResult, waResult] = await Promise.all([
        sendSMS(phone, message),
        sendWhatsApp({ phone, patientName: patientData.name.trim(), doctorName: selectedDoctor.docName, date: todayDate, shift: selectedShift.label }),
      ])
      if (smsResult.ok) toast.success('تم إرسال رسالة SMS')
      else toast.error(`فشل SMS: ${smsResult.error}`)
      if (waResult.ok) toast.success('تم إرسال رسالة واتساب')
      else toast.error(`فشل واتساب: ${waResult.error}${(waResult as any).code ? ` (#${(waResult as any).code})` : ''}`)

      const slots = await getBookedSlots(facilityId, selectedDoctor.id, todayDate)
      const counts = categorizeSlotsByShift(slots, selectedDoctor.workingSchedule?.[todayDayName])
      setBookedCounts((prev) => ({ ...prev, [selectedDoctor.id]: counts }))
      setShowFormModal(false)
      setPatientData({ name: '', phone: '' })
      setSelectedDoctor(null)
      setSelectedShift(null)
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء إتمام الحجز') }
    finally { setIsBooking(false) }
  }

  const filteredSpecialties = specialties.map((spec) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return spec
    const specMatches = spec.specName.toLowerCase().includes(term)
    const filteredDoctors = spec.doctors.filter((doc) => doc.docName.toLowerCase().includes(term))
    if (specMatches) return spec
    if (filteredDoctors.length > 0) return { ...spec, doctors: filteredDoctors }
    return null
  }).filter(Boolean) as Specialty[]

  if (loading) return <Spinner size="lg" />

  // ── Shift cell ──────────────────────────────────────────────────
  const ShiftCell = ({ doc, spec, shift }: { doc: Doctor, spec: Specialty, shift?: Shift }) => {
    if (!shift) return (
      <td className="px-3 py-2 text-center text-xs text-gray-300 whitespace-nowrap">—</td>
    )
    const counts = bookedCounts[doc.id] || { morning: 0, evening: 0 }
    const hasCounts = !!bookedCounts[doc.id]
    const limit = (shift.type === 'morning' ? doc.morningPatientLimit : doc.eveningPatientLimit) || 0
    const booked = (shift.type === 'morning' ? counts.morning : counts.evening) || 0
    const isFull = limit > 0 && booked >= limit
    const excess = limit > 0 ? Math.max(0, booked - limit) : 0

    return (
      <td className="px-3 py-2 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => handleOpenPatientList(doc, shift.type)}
            title="عرض الكشف"
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums transition hover:opacity-80 cursor-pointer',
              isFull
                ? 'border-red-200 bg-red-50 text-red-600'
                : hasCounts
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-gray-50 text-gray-400'
            )}
          >
            {hasCounts ? `${booked}/${limit}` : '—'}
          </button>
          {excess > 0 && (
            <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white" title="تجاوز الحد">
              +{excess}
            </span>
          )}
          <button
            onMouseEnter={() => fetchDoctorCounts(doc)}
            onClick={() => { setSelectedDoctor(doc); setSelectedSpec(spec); setSelectedShift(shift); setShowFormModal(true) }}
            className={cn(
              'rounded px-2.5 py-0.5 text-xs font-bold transition cursor-pointer active:scale-95',
              isFull
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            حجز
          </button>
        </div>
      </td>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 md:px-6">

      {/* ── Header ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-600 uppercase tracking-wide">
            <Zap className="h-3 w-3" /> LIVE
          </span>
          <h1 className="text-base font-bold text-gray-900">حجز اليوم — {todayDate}</h1>
        </div>

        {/* Search */}
        <div className="relative w-48">
          <Search className="absolute center-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث..."
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-16 text-center shadow-sm">
          <Stethoscope className="mb-3 h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-400">لا يوجد أطباء مداومون اليوم</p>
        </div>
      ) : filteredSpecialties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-16 text-center shadow-sm">
          <p className="text-sm text-gray-400">لا توجد نتائج تطابق "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')} className="mt-2 text-xs text-blue-600 hover:underline">عرض الكل</button>
        </div>
      ) : (

        /* ── Table ── */
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                  <th className="px-3 py-2.5 text-center"></th>
                  <th className="px-3 py-2.5 text-center">الطبيب</th>
                  <th className="px-3 py-2.5 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Sun className="h-3.5 w-3.5 text-amber-400" /> صباحاً
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Moon className="h-3.5 w-3.5 text-indigo-400" /> مساءً
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSpecialties.flatMap((spec) =>
                  spec.doctors.map((doc) => {
                    const shifts = getWorkingShifts(doc, today) || []
                    const morningShift = shifts.find((s: any) => s.type === 'morning') as Shift | undefined
                    const eveningShift = shifts.find((s: any) => s.type === 'evening') as Shift | undefined

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-3 py-2 text-center">
                          <ZoomableAvatar src={doc.photoUrl} alt={doc.docName} size={7} />
                        </td>
                        <td className="px-3 py-2 text-center" title={spec.specName}>
                          <p className="text-xs font-bold text-gray-900 leading-tight cursor-default">{doc.docName}</p>
                          {doc.phoneNumber && (
                            <p className="text-[11px] text-gray-400" dir="ltr">{doc.phoneNumber}</p>
                          )}
                        </td>
                        <ShiftCell doc={doc} spec={spec} shift={morningShift} />
                        <ShiftCell doc={doc} spec={spec} shift={eveningShift} />
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Booking Form Modal ── */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={`حجز — د. ${selectedDoctor?.docName}`} size="lg">
        <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold text-blue-700 mb-0.5">الموعد</p>
            <p className="text-sm font-bold text-gray-900">{todayDate} · {selectedShift?.label}</p>
          </div>
          <span className="text-lg font-bold text-blue-700" dir="ltr">{selectedShift?.start}</span>
        </div>

        <form onSubmit={handleConfirmBooking} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">اسم المريض الكامل</label>
            <input
              autoFocus
              required
              value={patientData.name}
              onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
              placeholder="أدخل الاسم الرباعي"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">رقم الهاتف</label>
            <input
              required
              type="tel"
              dir="ltr"
              value={patientData.phone}
              onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
              placeholder="09XXXXXXXX"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isBooking}
              className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-60"
            >
              {isBooking && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {isBooking ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Patient List Modal ── */}
      <Modal isOpen={showPatientList} onClose={() => setShowPatientList(false)} title={`كشف د. ${listDoctor?.docName} — ${todayDate}`} size="3xl">
        {loadingList ? (
          <Spinner size="md" />
        ) : (
          <div>
            {/* Tabs */}
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
                    listTab === key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Appointment list */}
            {(() => {
              const sectionAppts = listAppointments.filter((a) => a.period === listTab)
              if (sectionAppts.length === 0) return (
                <div className="py-10 text-center text-sm text-gray-400">
                  لا يوجد حجوزات لهذه الفترة
                </div>
              )
              return (
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500">
                        <th className="px-2 py-2 text-center w-7">#</th>
                        <th className="px-2 py-2 text-center">الاسم</th>
                        <th className="px-2 py-2 text-center">الهاتف</th>
                        <th className="px-2 py-2 text-center">تاريخ الحجز</th>
                        <th className="px-2 py-2 text-center">منذ</th>
                        <th className="px-2 py-2 text-center">إلغاء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sectionAppts.map((appt, idx) => {
                        const createdAt = appt.createdAt?.toDate ? appt.createdAt.toDate() : appt.createdAt ? new Date(appt.createdAt) : null
                        return (
                          <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-2 py-1.5 text-gray-300 font-bold text-center">{sectionAppts.length - idx}</td>
                            <td className="px-2 py-1.5 font-bold text-gray-900 whitespace-nowrap text-center">{appt.patientName}</td>
                            <td className="px-2 py-1.5 text-blue-600 whitespace-nowrap text-center" dir="ltr">{appt.patientPhone || '—'}</td>
                     
                            <td className="px-2 py-1.5 text-center text-gray-500 whitespace-nowrap" dir="ltr">
                              {createdAt ? (
                                <span>{createdAt.toLocaleDateString('ar-EG')} {createdAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                              ) : '—'}
                            </td>
                            <td className="px-2 py-1.5 text-center text-gray-400 whitespace-nowrap">
                              {timeAgo(appt.createdAt)}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                disabled={cancelingId === appt.id}
                                onClick={() => handleCancelAppointment(appt)}
                                className="inline-flex items-center justify-center h-6 w-6 rounded border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                              >
                                {cancelingId === appt.id
                                  ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-200 border-t-red-500" />
                                  : <X className="h-3.5 w-3.5" />}
                              </button>
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

export default CallCenterBookToday

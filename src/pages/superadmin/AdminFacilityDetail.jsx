import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getFacilityById,
  getSpecializations,
  createSpecialization,
  updateSpecialization,
  deleteSpecialization,
  getDoctorsBySpec,
  addDoctorToSpec,
  updateDoctorInSpec,
  deleteDoctorFromSpec,
  getInsuranceCompanies,
  createFacilityInsurance,
  updateFacilityInsurance,
  deleteFacilityInsurance,
} from '../../services/facilityService'
import { getAppointments } from '../../services/appointmentService'
import { getUsersByFacility, createFacilityUser, updateFacilityUser, deleteFacilityUser } from '../../services/userService'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import AppointmentStatusBadge from '../../components/appointment/AppointmentStatusBadge'

// ─── Specializations Tab ───────────────────────────────────────────────────────

const SPEC_EMPTY = { specName: '', description: '', isActive: true, order: 0, centralSpecialtyId: '' }
const DOC_EMPTY = { docName: '', phoneNumber: '', morningPatientLimit: 5, eveningPatientLimit: 5, isActive: true, isBookingEnabled: true, photoUrl: '', centralDoctorId: '', specialization: '' }

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const EMPTY_SHIFT = { start: '08:00', end: '17:00' }
const EMPTY_EVENING = { start: '18:00', end: '21:00' }

const scheduleToRows = (schedule = {}) =>
  DAYS.map((day) => ({
    day,
    enabled: !!schedule[day],
    morning: { enabled: !!schedule[day]?.morning, ...(schedule[day]?.morning || EMPTY_SHIFT) },
    evening: { enabled: !!schedule[day]?.evening, ...(schedule[day]?.evening || EMPTY_EVENING) },
  }))

const rowsToSchedule = (rows) =>
  Object.fromEntries(
    rows
      .filter((r) => r.enabled)
      .map((r) => {
        const shifts = {}
        if (r.morning.enabled) shifts.morning = { start: r.morning.start, end: r.morning.end }
        if (r.evening.enabled) shifts.evening = { start: r.evening.start, end: r.evening.end }
        return [r.day, shifts]
      })
  )

const SpecializationsTab = ({ facilityId }) => {
  const [specs, setSpecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [doctorsBySpec, setDoctorsBySpec] = useState({})
  const [loadingDoctors, setLoadingDoctors] = useState({})

  // Spec modal
  const [specModal, setSpecModal] = useState(false)
  const [editSpec, setEditSpec] = useState(null)
  const [specForm, setSpecForm] = useState(SPEC_EMPTY)
  const [savingSpec, setSavingSpec] = useState(false)

  // Doctor modal
  const [docModal, setDocModal] = useState(false)
  const [docSpecId, setDocSpecId] = useState(null)
  const [editDoc, setEditDoc] = useState(null)
  const [docForm, setDocForm] = useState(DOC_EMPTY)
  const [scheduleRows, setScheduleRows] = useState(scheduleToRows())
  const [savingDoc, setSavingDoc] = useState(false)

  const loadSpecs = async () => {
    setLoading(true)
    try {
      const data = await getSpecializations(facilityId)
      const sorted = [...data].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      setSpecs(sorted)
    } catch {
      toast.error('حدث خطأ أثناء تحميل التخصصات')
    }
    setLoading(false)
  }

  useEffect(() => { loadSpecs() }, [facilityId])

  const loadDoctors = async (specId) => {
    if (doctorsBySpec[specId] !== undefined) return
    setLoadingDoctors((p) => ({ ...p, [specId]: true }))
    try {
      const docs = await getDoctorsBySpec(facilityId, specId)
      setDoctorsBySpec((p) => ({ ...p, [specId]: docs }))
    } catch {
      toast.error('حدث خطأ أثناء تحميل الأطباء')
    }
    setLoadingDoctors((p) => ({ ...p, [specId]: false }))
  }

  const toggleExpand = (specId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(specId)) {
        next.delete(specId)
      } else {
        next.add(specId)
        loadDoctors(specId)
      }
      return next
    })
  }

  // Spec handlers
  const openAddSpec = () => { setSpecForm(SPEC_EMPTY); setEditSpec(null); setSpecModal(true) }
  const openEditSpec = (s) => { setSpecForm({ ...SPEC_EMPTY, ...s }); setEditSpec(s); setSpecModal(true) }
  const closeSpecModal = () => { setSpecModal(false); setEditSpec(null) }

  const handleSpecField = (e) => {
    const { name, value, type, checked } = e.target
    setSpecForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSpecSubmit = async (e) => {
    e.preventDefault()
    if (!specForm.specName.trim()) { toast.error('اسم التخصص مطلوب'); return }
    setSavingSpec(true)
    try {
      const payload = { ...specForm, order: Number(specForm.order) || 0 }
      if (editSpec) {
        await updateSpecialization(facilityId, editSpec.id, payload)
        toast.success('تم تحديث التخصص')
      } else {
        await createSpecialization(facilityId, payload)
        toast.success('تم إضافة التخصص')
      }
      closeSpecModal()
      loadSpecs()
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة')
    } finally {
      setSavingSpec(false)
    }
  }

  const handleDeleteSpec = async (spec) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${spec.specName}"؟`)) return
    try {
      await deleteSpecialization(facilityId, spec.id)
      toast.success('تم حذف التخصص')
      loadSpecs()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const handleToggleSpec = async (spec) => {
    try {
      await updateSpecialization(facilityId, spec.id, { isActive: !spec.isActive })
      toast.success(spec.isActive ? 'تم إيقاف التخصص' : 'تم تفعيل التخصص')
      loadSpecs()
    } catch {
      toast.error('حدث خطأ')
    }
  }

  // Doctor handlers
  const openAddDoc = (specId, specCentralId) => {
    setDocForm({ ...DOC_EMPTY, specialization: specCentralId || '' })
    setScheduleRows(scheduleToRows())
    setEditDoc(null)
    setDocSpecId(specId)
    setDocModal(true)
  }
  const openEditDoc = (specId, d) => {
    setDocForm({ ...DOC_EMPTY, ...d })
    setScheduleRows(scheduleToRows(d.workingSchedule))
    setEditDoc(d)
    setDocSpecId(specId)
    setDocModal(true)
  }
  const closeDocModal = () => {
    setDocModal(false)
    setEditDoc(null)
    setDocSpecId(null)
    setScheduleRows(scheduleToRows())
  }

  const handleDocField = (e) => {
    const { name, value, type, checked } = e.target
    setDocForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  // Schedule row helpers
  const toggleDay = (i) =>
    setScheduleRows((rows) => rows.map((r, idx) => idx === i ? { ...r, enabled: !r.enabled } : r))

  const toggleShift = (dayIdx, shift) =>
    setScheduleRows((rows) => rows.map((r, idx) =>
      idx === dayIdx ? { ...r, [shift]: { ...r[shift], enabled: !r[shift].enabled } } : r
    ))

  const setShiftTime = (dayIdx, shift, field, val) =>
    setScheduleRows((rows) => rows.map((r, idx) =>
      idx === dayIdx ? { ...r, [shift]: { ...r[shift], [field]: val } } : r
    ))

  const handleDocSubmit = async (e) => {
    e.preventDefault()
    if (!docForm.docName.trim()) { toast.error('اسم الطبيب مطلوب'); return }
    setSavingDoc(true)
    try {
      const payload = {
        ...docForm,
        morningPatientLimit: Number(docForm.morningPatientLimit) || 0,
        eveningPatientLimit: Number(docForm.eveningPatientLimit) || 0,
        workingSchedule: rowsToSchedule(scheduleRows),
      }
      if (editDoc) {
        await updateDoctorInSpec(facilityId, docSpecId, editDoc.id, payload)
        toast.success('تم تحديث الطبيب')
      } else {
        await addDoctorToSpec(facilityId, docSpecId, payload)
        toast.success('تم إضافة الطبيب')
      }
      closeDocModal()
      setDoctorsBySpec((p) => ({ ...p, [docSpecId]: undefined }))
      setTimeout(() => loadDoctors(docSpecId), 100)
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة')
    } finally {
      setSavingDoc(false)
    }
  }

  const handleDeleteDoc = async (specId, doctor) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${doctor.docName}"؟`)) return
    try {
      await deleteDoctorFromSpec(facilityId, specId, doctor.id)
      toast.success('تم حذف الطبيب')
      setDoctorsBySpec((p) => ({ ...p, [specId]: undefined }))
      loadDoctors(specId)
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const handleToggleDoc = async (specId, doctor, field) => {
    try {
      await updateDoctorInSpec(facilityId, specId, doctor.id, { [field]: !doctor[field] })
      setDoctorsBySpec((p) => ({
        ...p,
        [specId]: (p[specId] || []).map((d) => d.id === doctor.id ? { ...d, [field]: !doctor[field] } : d),
      }))
    } catch {
      toast.error('حدث خطأ')
    }
  }

  if (loading) return <Spinner size="lg" className="py-16" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{specs.length} تخصص</p>
        <button
          onClick={openAddSpec}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
        >
          + إضافة تخصص
        </button>
      </div>

      {specs.length === 0 ? (
        <div className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">⚕️</div>
          <p>لا توجد تخصصات بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {specs.map((spec) => {
            const isOpen = expandedIds.has(spec.id)
            const doctors = doctorsBySpec[spec.id] || []
            const isLoadingDocs = loadingDoctors[spec.id]

            return (
              <div key={spec.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Spec header row */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <button
                    onClick={() => toggleExpand(spec.id)}
                    className="text-gray-400 hover:text-gray-700 transition text-lg w-5 flex-shrink-0 mt-0.5"
                  >
                    {isOpen ? '▾' : '▸'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{spec.specName}</p>
                    {spec.description
                      ? <p className="text-xs text-gray-500 mt-0.5">{spec.description}</p>
                      : <p className="text-xs text-gray-300 mt-0.5">لا يوجد وصف</p>
                    }
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {spec.centralSpecialtyId && (
                        <span className="text-xs text-gray-400" dir="ltr">ID: {spec.centralSpecialtyId}</span>
                      )}
                      <span className="text-xs text-gray-400">ترتيب: {spec.order ?? '-'}</span>
                      {spec.createdAt?.toDate && (
                        <span className="text-xs text-gray-400">
                          {spec.createdAt.toDate().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSpec(spec)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition flex-shrink-0 mt-0.5
                      ${spec.isActive !== false ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
                  >
                    {spec.isActive !== false ? 'مفعل' : 'معطل'}
                  </button>
                  <div className="flex gap-2 flex-shrink-0 mt-0.5">
                    <button onClick={() => openEditSpec(spec)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">تعديل</button>
                    <button onClick={() => handleDeleteSpec(spec)} className="text-red-500 hover:text-red-700 text-xs font-medium">حذف</button>
                  </div>
                </div>

                {/* Doctors sub-list */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        الأطباء {!isLoadingDocs && `(${doctors.length})`}
                      </p>
                      <button
                        onClick={() => openAddDoc(spec.id, spec.centralSpecialtyId)}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        + إضافة طبيب
                      </button>
                    </div>

                    {isLoadingDocs ? (
                      <Spinner size="sm" className="py-4" />
                    ) : doctors.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">لا يوجد أطباء في هذا التخصص</p>
                    ) : (
                      <div className="space-y-2">
                        {doctors.map((doctor) => (
                          <div key={doctor.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                              {doctor.photoUrl
                                ? <img src={doctor.photoUrl} alt={doctor.docName} className="w-full h-full object-cover rounded-full" />
                                : '👨‍⚕️'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 text-sm">{doctor.docName}</p>
                              {doctor.phoneNumber && (
                                <p className="text-xs text-gray-500" dir="ltr">{doctor.phoneNumber}</p>
                              )}
                              <p className="text-xs text-gray-400">صباحي: {doctor.morningPatientLimit} | مسائي: {doctor.eveningPatientLimit}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleToggleDoc(spec.id, doctor, 'isActive')}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition
                                  ${doctor.isActive !== false ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
                              >
                                {doctor.isActive !== false ? 'نشط' : 'معطل'}
                              </button>
                              <button
                                onClick={() => handleToggleDoc(spec.id, doctor, 'isBookingEnabled')}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition
                                  ${doctor.isBookingEnabled ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                              >
                                {doctor.isBookingEnabled ? 'حجز مفتوح' : 'حجز مغلق'}
                              </button>
                              <button onClick={() => openEditDoc(spec.id, doctor)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">تعديل</button>
                              <button onClick={() => handleDeleteDoc(spec.id, doctor)} className="text-red-500 hover:text-red-700 text-xs font-medium">حذف</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Specialization Modal */}
      <Modal isOpen={specModal} onClose={closeSpecModal} title={editSpec ? 'تعديل التخصص' : 'إضافة تخصص جديد'} size="md">
        <form onSubmit={handleSpecSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم التخصص *</label>
            <input name="specName" value={specForm.specName} onChange={handleSpecField} required placeholder="طب عام..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea name="description" value={specForm.description} onChange={handleSpecField} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الترتيب</label>
              <input type="number" name="order" value={specForm.order} onChange={handleSpecField} min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">معرّف التخصص المركزي</label>
              <input name="centralSpecialtyId" value={specForm.centralSpecialtyId} onChange={handleSpecField} dir="ltr"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="isActive" id="specIsActive" checked={specForm.isActive} onChange={handleSpecField} className="w-4 h-4 accent-purple-600" />
            <label htmlFor="specIsActive" className="text-sm font-medium text-gray-700">التخصص مفعل</label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeSpecModal} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition font-medium">إلغاء</button>
            <button type="submit" disabled={savingSpec} className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50">
              {savingSpec ? 'جاري الحفظ...' : editSpec ? 'حفظ التعديلات' : 'إضافة التخصص'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Doctor Modal */}
      <Modal isOpen={docModal} onClose={closeDocModal} title={editDoc ? 'تعديل الطبيب' : 'إضافة طبيب'} size="lg">
        <form onSubmit={handleDocSubmit} className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطبيب *</label>
              <input name="docName" value={docForm.docName} onChange={handleDocField} required placeholder="د. محمد..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
              <input name="phoneNumber" value={docForm.phoneNumber} onChange={handleDocField} dir="ltr"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">معرّف الطبيب المركزي</label>
              <input name="centralDoctorId" value={docForm.centralDoctorId} onChange={handleDocField} dir="ltr"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">معرّف التخصص</label>
              <input name="specialization" value={docForm.specialization} onChange={handleDocField} dir="ltr"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">حد المرضى الصباحي</label>
              <input type="number" name="morningPatientLimit" value={docForm.morningPatientLimit} onChange={handleDocField} min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">حد المرضى المسائي</label>
              <input type="number" name="eveningPatientLimit" value={docForm.eveningPatientLimit} onChange={handleDocField} min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رابط الصورة</label>
            <input name="photoUrl" value={docForm.photoUrl} onChange={handleDocField} dir="ltr" placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" name="isActive" id="docIsActive" checked={docForm.isActive} onChange={handleDocField} className="w-4 h-4 accent-green-600" />
              <label htmlFor="docIsActive" className="text-sm font-medium text-gray-700">الطبيب نشط</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="isBookingEnabled" id="docBooking" checked={docForm.isBookingEnabled} onChange={handleDocField} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="docBooking" className="text-sm font-medium text-gray-700">الحجز مفتوح</label>
            </div>
          </div>

          {/* Working schedule */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">جدول العمل</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {scheduleRows.map((row, i) => (
                <div key={row.day} className={`px-3 py-2 ${row.enabled ? 'bg-white' : 'bg-gray-50'}`}>
                  {/* Day header */}
                  <div className="flex items-center gap-2 mb-1">
                    <input type="checkbox" checked={row.enabled} onChange={() => toggleDay(i)}
                      className="w-4 h-4 accent-green-600 flex-shrink-0" />
                    <span className={`text-sm font-medium ${row.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{row.day}</span>
                  </div>
                  {/* Shifts */}
                  {row.enabled && (
                    <div className="mr-6 space-y-1.5">
                      {/* Morning */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <input type="checkbox" checked={row.morning.enabled} onChange={() => toggleShift(i, 'morning')}
                          className="w-3.5 h-3.5 accent-orange-500" />
                        <span className="text-xs text-gray-500 w-10">صباحي</span>
                        {row.morning.enabled && (
                          <>
                            <input type="time" value={row.morning.start} onChange={(e) => setShiftTime(i, 'morning', 'start', e.target.value)}
                              className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400" dir="ltr" />
                            <span className="text-xs text-gray-400">—</span>
                            <input type="time" value={row.morning.end} onChange={(e) => setShiftTime(i, 'morning', 'end', e.target.value)}
                              className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400" dir="ltr" />
                          </>
                        )}
                      </div>
                      {/* Evening */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <input type="checkbox" checked={row.evening.enabled} onChange={() => toggleShift(i, 'evening')}
                          className="w-3.5 h-3.5 accent-indigo-500" />
                        <span className="text-xs text-gray-500 w-10">مسائي</span>
                        {row.evening.enabled && (
                          <>
                            <input type="time" value={row.evening.start} onChange={(e) => setShiftTime(i, 'evening', 'start', e.target.value)}
                              className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400" dir="ltr" />
                            <span className="text-xs text-gray-400">—</span>
                            <input type="time" value={row.evening.end} onChange={(e) => setShiftTime(i, 'evening', 'end', e.target.value)}
                              className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400" dir="ltr" />
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeDocModal} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition font-medium">إلغاء</button>
            <button type="submit" disabled={savingDoc} className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50">
              {savingDoc ? 'جاري الحفظ...' : editDoc ? 'حفظ التعديلات' : 'إضافة الطبيب'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Appointments Tab ──────────────────────────────────────────────────────────

const AppointmentsTab = ({ facilityId }) => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAppointments(facilityId)
      .then(setAppointments)
      .catch(() => toast.error('حدث خطأ أثناء تحميل المواعيد'))
      .finally(() => setLoading(false))
  }, [facilityId])

  if (loading) return <Spinner size="lg" className="py-16" />

  if (appointments.length === 0) return (
    <div className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-gray-100">
      <div className="text-5xl mb-3">📅</div>
      <p>لا توجد مواعيد بعد</p>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <p className="px-5 py-3 text-sm text-gray-500 border-b">{appointments.length} موعد</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-right">
            <tr>
              <th className="px-5 py-3 font-medium">المريض</th>
              <th className="px-5 py-3 font-medium hidden sm:table-cell">الطبيب</th>
              <th className="px-5 py-3 font-medium hidden md:table-cell">التاريخ</th>
              <th className="px-5 py-3 font-medium hidden md:table-cell">الوقت</th>
              <th className="px-5 py-3 font-medium hidden lg:table-cell">التأمين</th>
              <th className="px-5 py-3 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {appointments.map((apt) => (
              <tr key={apt.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-800">{apt.patientName || '-'}</td>
                <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">{apt.doctorName || '-'}</td>
                <td className="px-5 py-3 text-gray-600 hidden md:table-cell" dir="ltr">{apt.date || '-'}</td>
                <td className="px-5 py-3 text-gray-600 hidden md:table-cell" dir="ltr">{apt.timeSlot || '-'}</td>
                <td className="px-5 py-3 text-gray-500 hidden lg:table-cell">{apt.insurance || '-'}</td>
                <td className="px-5 py-3">
                  <AppointmentStatusBadge status={apt.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Insurance Tab ─────────────────────────────────────────────────────────────

const INS_EMPTY = { name: '', description: '', phone: '', enabled: true }

const InsuranceTab = ({ facilityId }) => {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(INS_EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setCompanies(await getInsuranceCompanies(facilityId))
    } catch {
      toast.error('حدث خطأ أثناء تحميل شركات التأمين')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [facilityId])

  const handleField = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const openAdd = () => { setForm(INS_EMPTY); setEditTarget(null); setModal(true) }
  const openEdit = (c) => { setForm({ ...INS_EMPTY, ...c }); setEditTarget(c); setModal(true) }
  const closeModal = () => { setModal(false); setEditTarget(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('اسم الشركة مطلوب'); return }
    setSaving(true)
    try {
      if (editTarget) {
        await updateFacilityInsurance(facilityId, editTarget.id, form)
        toast.success('تم تحديث الشركة')
      } else {
        await createFacilityInsurance(facilityId, form)
        toast.success('تم إضافة الشركة')
      }
      closeModal()
      load()
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (company) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${company.name}"؟`)) return
    try {
      await deleteFacilityInsurance(facilityId, company.id)
      toast.success('تم حذف الشركة')
      load()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const handleToggle = async (company) => {
    try {
      await updateFacilityInsurance(facilityId, company.id, { enabled: !company.enabled })
      toast.success(company.enabled ? 'تم إيقاف الشركة' : 'تم تفعيل الشركة')
      load()
    } catch {
      toast.error('حدث خطأ')
    }
  }

  if (loading) return <Spinner size="lg" className="py-16" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{companies.length} شركة تأمين</p>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
          + إضافة شركة
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">🛡️</div>
          <p>لا توجد شركات تأمين بعد</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-right">
              <tr>
                <th className="px-5 py-3 font-medium">الشركة</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">الهاتف</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">الوصف</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell" dir="ltr">{c.phone || '-'}</td>
                  <td className="px-5 py-3 text-gray-500 hidden md:table-cell max-w-[180px] truncate">{c.description || '-'}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggle(c)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition
                        ${c.enabled !== false ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
                    >
                      {c.enabled !== false ? 'مفعل' : 'معطل'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">تعديل</button>
                      <button onClick={() => handleDelete(c)} className="text-red-500 hover:text-red-700 text-xs font-medium">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modal} onClose={closeModal} title={editTarget ? 'تعديل شركة التأمين' : 'إضافة شركة تأمين'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الشركة *</label>
            <input name="name" value={form.name} onChange={handleField} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
            <input name="phone" value={form.phone} onChange={handleField} dir="ltr"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea name="description" value={form.description} onChange={handleField} rows={2} resize="none"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="enabled" id="insEnabled" checked={form.enabled} onChange={handleField} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="insEnabled" className="text-sm font-medium text-gray-700">الشركة مفعلة</label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition font-medium">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
              {saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة الشركة'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Users Tab ─────────────────────────────────────────────────────────────────

const USER_EMPTY = { userName: '', userPhone: '', userPassword: '', userType: 'user' }

const UsersTab = ({ facilityId, facilityName }) => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(USER_EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setUsers(await getUsersByFacility(facilityId))
    } catch {
      toast.error('حدث خطأ أثناء تحميل المستخدمين')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [facilityId])

  const handleField = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const openAdd = () => { setForm(USER_EMPTY); setEditTarget(null); setModal(true) }
  const openEdit = (u) => {
    setForm({ userName: u.userName || '', userPhone: u.userPhone || '', userPassword: '', userType: u.userType || 'user' })
    setEditTarget(u)
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditTarget(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.userName.trim()) { toast.error('اسم المستخدم مطلوب'); return }
    setSaving(true)
    try {
      if (editTarget) {
        const payload = { userName: form.userName, userPhone: form.userPhone, userType: form.userType }
        if (form.userPassword.trim()) payload.userPassword = form.userPassword
        await updateFacilityUser(editTarget.id, payload)
        toast.success('تم تحديث المستخدم')
      } else {
        await createFacilityUser({
          userName: form.userName,
          userPhone: form.userPhone,
          userPassword: form.userPassword,
          userType: form.userType,
          centerId: facilityId,
          centerName: facilityName || '',
        })
        toast.success('تم إضافة المستخدم')
      }
      closeModal()
      load()
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${user.userName}"؟`)) return
    try {
      await deleteFacilityUser(user.id)
      toast.success('تم حذف المستخدم')
      load()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  if (loading) return <Spinner size="lg" className="py-16" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{users.length} مستخدم</p>
        <button onClick={openAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          + إضافة مستخدم
        </button>
      </div>

      {users.length === 0 ? (
        <div className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">👤</div>
          <p>لا يوجد مستخدمون بعد</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-right">
              <tr>
                <th className="px-5 py-3 font-medium">المستخدم</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">الهاتف</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">النوع</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">الحالة</th>
                <th className="px-5 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                        {u.photoUrl
                          ? <img src={u.photoUrl} alt={u.userName} className="w-full h-full object-cover rounded-full" />
                          : '👤'}
                      </div>
                      <p className="font-medium text-gray-800">{u.userName}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell" dir="ltr">{u.userPhone || '-'}</td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{u.userType || '-'}</span>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.isOnline ? 'متصل' : 'غير متصل'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">تعديل</button>
                      <button onClick={() => handleDelete(u)} className="text-red-500 hover:text-red-700 text-xs font-medium">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modal} onClose={closeModal} title={editTarget ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم *</label>
            <input name="userName" value={form.userName} onChange={handleField} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
            <input name="userPhone" value={form.userPhone} onChange={handleField} dir="ltr"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع المستخدم</label>
            <select name="userType" value={form.userType} onChange={handleField}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              كلمة المرور {editTarget && <span className="text-gray-400 font-normal">(اتركها فارغة للإبقاء على الحالية)</span>}
            </label>
            <input type="password" name="userPassword" value={form.userPassword} onChange={handleField}
              required={!editTarget}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition font-medium">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50">
              {saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة المستخدم'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'specializations', label: 'التخصصات', icon: '⚕️' },
  { key: 'appointments', label: 'المواعيد', icon: '📅' },
  { key: 'insurance', label: 'شركات التأمين', icon: '🛡️' },
  { key: 'users', label: 'المستخدمون', icon: '👤' },
]

const AdminFacilityDetail = () => {
  const { facilityId } = useParams()
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('specializations')

  useEffect(() => {
    getFacilityById(facilityId)
      .then(setFacility)
      .catch(() => toast.error('حدث خطأ أثناء تحميل بيانات المرفق'))
      .finally(() => setLoading(false))
  }, [facilityId])

  if (loading) return <Spinner size="lg" className="py-32" />
  if (!facility) return (
    <div className="text-center py-32 text-gray-400">
      <div className="text-6xl mb-4">❌</div>
      <p>المرفق غير موجود</p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link to="/superadmin/facilities" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        ← العودة إلى المرافق
      </Link>

      {/* Facility header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="h-36 bg-gradient-to-br from-blue-100 to-indigo-200">
          {facility.imageUrl && (
            <img src={facility.imageUrl} alt={facility.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800">{facility.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${facility.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {facility.available ? 'نشط' : 'معطل'}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              {facility.address && <span>📍 {facility.address}</span>}
              {facility.phone && <span dir="ltr">📞 {facility.phone}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition
              ${activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'specializations' && <SpecializationsTab facilityId={facilityId} />}
        {activeTab === 'appointments' && <AppointmentsTab facilityId={facilityId} />}
        {activeTab === 'insurance' && <InsuranceTab facilityId={facilityId} />}
        {activeTab === 'users' && <UsersTab facilityId={facilityId} facilityName={facility.name} />}
      </div>
    </div>
  )
}

export default AdminFacilityDetail

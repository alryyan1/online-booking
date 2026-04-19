import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { formatDate } from '../../utils/bookingUtils'
import {
  getFacilityById, getSpecializations, createSpecialization, updateSpecialization,
  deleteSpecialization, getDoctorsBySpec, addDoctorToSpec, updateDoctorInSpec,
  deleteDoctorFromSpec, getInsuranceCompanies, createFacilityInsurance,
  updateFacilityInsurance, deleteFacilityInsurance,
} from '../../services/facilityService'
import { getAppointments, updateAppointmentStatus } from '../../services/appointmentService'
import { sendSMS, sendCancelWhatsApp, buildCancelMessage } from '../../services/notificationService'
import { getUsersByFacility, createFacilityUser, updateFacilityUser, deleteFacilityUser, deleteAuthUser } from '../../services/userService'
import { adminRegisterUser } from '../../services/authService'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../../services/firebase'
import { getCentralDoctors } from '../../services/doctorService'
import { getSpecialties as getCentralSpecialties } from '../../services/specialtyService'
import { getInsuranceCompanies as getCentralInsurance } from '../../services/insuranceService'
import { APPOINTMENT_STATUS } from '../../utils/constants'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import { cn } from '../../lib/utils'
import {
  Plus, Pencil, Trash2, Search, X, Users, Building2, Shield,
  CalendarDays, MapPin, Phone, ChevronDown, Sun, Moon, User,
  Stethoscope, CheckCircle2, XCircle,
} from 'lucide-react'

// ─── Shared primitives ────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-blue-600' : 'bg-gray-300')}
      >
        <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}

function Combobox({ options = [], value, onChange, getLabel = (o) => o?.name || '', placeholder = 'اختر...', noOptionsText = 'لا يوجد نتائج', helperText, required }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const filtered = query.trim()
    ? options.filter((o) => getLabel(o).toLowerCase().includes(query.toLowerCase()))
    : options
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          value={open ? query : (value ? getLabel(value) : '')}
          onFocus={() => { setQuery(''); setOpen(true) }}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          required={required && !value}
          className="w-full rounded-md border border-gray-200 px-3 py-2 pr-3 pl-8 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-xl">
          {filtered.length === 0
            ? <p className="px-3 py-2 text-xs text-gray-400">{noOptionsText}</p>
            : filtered.map((opt, i) => (
              <button key={i} type="button"
                onClick={() => { onChange(opt); setOpen(false); setQuery('') }}
                className="w-full px-3 py-2 text-right text-sm hover:bg-blue-50 hover:text-blue-700 transition">
                {getLabel(opt)}
              </button>
            ))}
        </div>
      )}
      {helperText && <p className="mt-0.5 text-[11px] text-amber-600">{helperText}</p>}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-700">{label}</label>}
      {children}
    </div>
  )
}

const inputCls = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400'
const btnPrimary = 'flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60'
const btnOutline = 'flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition'
const btnDanger = 'flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition'
const iconBtn = 'flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 transition'

// ─── Constants ────────────────────────────────────────────────────────────────

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
    rows.filter((r) => r.enabled).map((r) => {
      const shifts = {}
      if (r.morning.enabled) shifts.morning = { start: r.morning.start, end: r.morning.end }
      if (r.evening.enabled) shifts.evening = { start: r.evening.start, end: r.evening.end }
      return [r.day, shifts]
    })
  )

// ─── Specializations Tab ──────────────────────────────────────────────────────

const SpecializationsTab = ({ facilityId }) => {
  const [specs, setSpecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [doctorsDialogSpec, setDoctorsDialogSpec] = useState(null)
  const [doctorsBySpec, setDoctorsBySpec] = useState({})
  const [loadingDoctors, setLoadingDoctors] = useState({})

  const [specModal, setSpecModal] = useState(false)
  const [editSpec, setEditSpec] = useState(null)
  const [specForm, setSpecForm] = useState(SPEC_EMPTY)
  const [savingSpec, setSavingSpec] = useState(false)

  const [docModal, setDocModal] = useState(false)
  const [docSpecId, setDocSpecId] = useState(null)
  const [editDoc, setEditDoc] = useState(null)
  const [docForm, setDocForm] = useState(DOC_EMPTY)
  const [scheduleRows, setScheduleRows] = useState(scheduleToRows())
  const [savingDoc, setSavingDoc] = useState(false)
  const [docTab, setDocTab] = useState('info')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [centralDoctors, setCentralDoctors] = useState([])
  const [centralSpecialties, setCentralSpecialties] = useState([])

  const loadSpecs = async () => {
    setLoading(true)
    try {
      const [specData, cDocs, cSpecs] = await Promise.all([getSpecializations(facilityId), getCentralDoctors(), getCentralSpecialties()])
      setSpecs([...specData].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)))
      setCentralDoctors(cDocs)
      setCentralSpecialties(cSpecs)
    } catch (err) { toast.error(`خطأ: ${err.message}`) }
    setLoading(false)
  }
  useEffect(() => { loadSpecs() }, [facilityId])

  const loadDoctors = async (specId) => {
    if (doctorsBySpec[specId] !== undefined) return
    setLoadingDoctors((p) => ({ ...p, [specId]: true }))
    try { const docs = await getDoctorsBySpec(facilityId, specId); setDoctorsBySpec((p) => ({ ...p, [specId]: docs })) }
    catch { toast.error('حدث خطأ أثناء تحميل الأطباء') }
    setLoadingDoctors((p) => ({ ...p, [specId]: false }))
  }

  const openDoctorsDialog = (spec) => { setDoctorsDialogSpec(spec); loadDoctors(spec.id) }

  const openAddSpec = () => {
    const nextOrder = specs.length > 0 ? Math.max(...specs.map((s) => s.order || 0)) + 1 : 1
    setSpecForm({ ...SPEC_EMPTY, order: nextOrder }); setEditSpec(null); setSpecModal(true)
  }
  const openEditSpec = (s) => { setSpecForm({ ...SPEC_EMPTY, ...s }); setEditSpec(s); setSpecModal(true) }

  const handleSpecSubmit = async (e) => {
    e.preventDefault()
    if (!specForm.specName.trim()) { toast.error('اسم التخصص مطلوب'); return }
    setSavingSpec(true)
    try {
      const payload = { ...specForm, order: Number(specForm.order) || 0 }
      if (editSpec) { await updateSpecialization(facilityId, editSpec.id, payload); toast.success('تم تحديث التخصص') }
      else { await createSpecialization(facilityId, payload); toast.success('تم إضافة التخصص') }
      setSpecModal(false); setEditSpec(null); loadSpecs()
    } catch { toast.error('حدث خطأ') } finally { setSavingSpec(false) }
  }

  const handleDeleteSpec = async (spec) => {
    if (!window.confirm(`حذف "${spec.specName}"؟`)) return
    try { await deleteSpecialization(facilityId, spec.id); toast.success('تم الحذف'); loadSpecs() }
    catch { toast.error('حدث خطأ') }
  }

  const handleToggleSpec = async (spec) => {
    try { await updateSpecialization(facilityId, spec.id, { isActive: !spec.isActive }); loadSpecs() }
    catch { toast.error('حدث خطأ') }
  }

  const openAddDoc = (specId, specCentralId) => {
    setDocForm({ ...DOC_EMPTY, specialization: specCentralId || '' })
    setScheduleRows(scheduleToRows()); setEditDoc(null); setDocSpecId(specId); setDocTab('info'); setDocModal(true)
  }
  const openEditDoc = (specId, d) => {
    setDocForm({ ...DOC_EMPTY, ...d }); setScheduleRows(scheduleToRows(d.workingSchedule))
    setEditDoc(d); setDocSpecId(specId); setDocTab('info'); setDocModal(true)
  }
  const closeDocModal = () => { setDocModal(false); setEditDoc(null); setDocSpecId(null); setScheduleRows(scheduleToRows()) }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const path = `${facilityId}/doctors/images/${Date.now()}-${file.name}`
    const task = uploadBytesResumable(storageRef(storage, path), file)
    setUploadingPhoto(true); setUploadProgress(0)
    task.on('state_changed',
      (snap) => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      () => { toast.error('فشل رفع الصورة'); setUploadingPhoto(false) },
      async () => { const url = await getDownloadURL(task.snapshot.ref); setDocForm((f) => ({ ...f, photoUrl: url })); setUploadingPhoto(false); toast.success('تم رفع الصورة') }
    )
  }

  const toggleDay = (i) => setScheduleRows((rows) => rows.map((r, idx) => idx === i ? { ...r, enabled: !r.enabled } : r))
  const toggleShift = (i, shift) => setScheduleRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [shift]: { ...r[shift], enabled: !r[shift].enabled } } : r))
  const setShiftTime = (i, shift, field, val) => setScheduleRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [shift]: { ...r[shift], [field]: val } } : r))

  const handleDocSubmit = async (e) => {
    e.preventDefault()
    if (!docForm.docName.trim()) { toast.error('اسم الطبيب مطلوب'); return }
    setSavingDoc(true)
    try {
      const payload = { ...docForm, morningPatientLimit: Number(docForm.morningPatientLimit) || 0, eveningPatientLimit: Number(docForm.eveningPatientLimit) || 0, workingSchedule: rowsToSchedule(scheduleRows) }
      if (editDoc) { await updateDoctorInSpec(facilityId, docSpecId, editDoc.id, payload); toast.success('تم التحديث') }
      else { await addDoctorToSpec(facilityId, docSpecId, payload); toast.success('تم الإضافة') }
      closeDocModal(); setDoctorsBySpec((p) => ({ ...p, [docSpecId]: undefined }))
      setTimeout(() => loadDoctors(docSpecId), 100)
    } catch { toast.error('حدث خطأ') } finally { setSavingDoc(false) }
  }

  const handleDeleteDoc = async (specId, doctor) => {
    if (!window.confirm(`حذف "${doctor.docName}"؟`)) return
    try { await deleteDoctorFromSpec(facilityId, specId, doctor.id); toast.success('تم الحذف'); setDoctorsBySpec((p) => ({ ...p, [specId]: undefined })); loadDoctors(specId) }
    catch { toast.error('حدث خطأ') }
  }

  const handleToggleDoc = async (specId, doctor, field) => {
    try {
      await updateDoctorInSpec(facilityId, specId, doctor.id, { [field]: !doctor[field] })
      setDoctorsBySpec((p) => ({ ...p, [specId]: (p[specId] || []).map((d) => d.id === doctor.id ? { ...d, [field]: !doctor[field] } : d) }))
    } catch { toast.error('حدث خطأ') }
  }

  if (loading) return <Spinner size="lg" />

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">{specs.length} تخصص</span>
        <button onClick={openAddSpec} className={btnPrimary}><Plus className="h-3.5 w-3.5" /> إضافة تخصص</button>
      </div>

      {specs.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Stethoscope className="mb-3 h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-400">لا توجد تخصصات بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {specs.map((spec) => (
            <div key={spec.id} className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 leading-tight truncate">{spec.specName}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{spec.description || 'لا يوجد وصف'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleToggleSpec(spec)}
                      className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold transition',
                        spec.isActive !== false ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100')}>
                      {spec.isActive !== false ? 'مفعل' : 'معطل'}
                    </button>
                    <button onClick={() => openEditSpec(spec)} className={iconBtn}><Pencil className="h-3 w-3" /></button>
                  </div>
                </div>
                {spec.order != null && (
                  <span className="self-start rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">ترتيب: {spec.order}</span>
                )}
              </div>
              <div className="border-t border-gray-100 px-3 py-2">
                <button onClick={() => openDoctorsDialog(spec)} className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition">
                  <Users className="h-3.5 w-3.5" /> إدارة الأطباء
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Doctors Modal */}
      <Modal isOpen={!!doctorsDialogSpec} onClose={() => setDoctorsDialogSpec(null)} title={doctorsDialogSpec?.specName} size="md">
        <div className="flex items-center justify-end mb-3">
          <button onClick={() => openAddDoc(doctorsDialogSpec.id, doctorsDialogSpec.centralSpecialtyId)} className={btnPrimary}>
            <Plus className="h-3.5 w-3.5" /> إضافة طبيب
          </button>
        </div>
        {loadingDoctors[doctorsDialogSpec?.id] ? <Spinner size="sm" />
          : (doctorsBySpec[doctorsDialogSpec?.id] || []).length === 0
            ? <p className="py-8 text-center text-sm text-gray-400">لا يوجد أطباء في هذا التخصص</p>
            : (
              <div className="flex flex-col gap-2">
                {(doctorsBySpec[doctorsDialogSpec?.id] || []).map((doctor) => (
                  <div key={doctor.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-blue-50 flex items-center justify-center">
                      {doctor.photoUrl ? <img src={doctor.photoUrl} alt={doctor.docName} className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{doctor.docName}</p>
                      {doctor.phoneNumber && <p className="text-xs text-gray-400" dir="ltr">{doctor.phoneNumber}</p>}
                      <p className="text-[11px] text-gray-400">ص: {doctor.morningPatientLimit} | م: {doctor.eveningPatientLimit}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <button onClick={() => handleToggleDoc(doctorsDialogSpec.id, doctor, 'isActive')}
                        className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold cursor-pointer',
                          doctor.isActive !== false ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                        {doctor.isActive !== false ? 'نشط' : 'معطل'}
                      </button>
                      <button onClick={() => handleToggleDoc(doctorsDialogSpec.id, doctor, 'isBookingEnabled')}
                        className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold cursor-pointer',
                          doctor.isBookingEnabled ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-500')}>
                        {doctor.isBookingEnabled ? 'حجز مفتوح' : 'حجز مغلق'}
                      </button>
                      <button onClick={() => openEditDoc(doctorsDialogSpec.id, doctor)} className={iconBtn}><Pencil className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </Modal>

      {/* Specialization Modal */}
      <Modal isOpen={specModal} onClose={() => { setSpecModal(false); setEditSpec(null) }} title={editSpec ? 'تعديل التخصص' : 'إضافة تخصص'} size="md">
        <form onSubmit={handleSpecSubmit} className="flex flex-col gap-3 pt-1">
          {!editSpec ? (
            <Field label="التخصص *">
              <Combobox
                options={centralSpecialties}
                getLabel={(o) => o?.name || ''}
                value={centralSpecialties.find((s) => String(s.id) === String(specForm.centralSpecialtyId)) || null}
                onChange={(v) => v ? setSpecForm((f) => ({ ...f, specName: v.name || '', description: v.description || '', centralSpecialtyId: v.id || '' })) : setSpecForm((f) => ({ ...f, specName: '', description: '', centralSpecialtyId: '' }))}
                placeholder="اختر من القائمة المركزية"
                noOptionsText={centralSpecialties.length === 0 ? 'لا يوجد تخصصات مركزية' : 'لا يوجد نتائج'}
                helperText={centralSpecialties.length === 0 ? 'تأكد من وجود بيانات في medicalSpecialties' : ''}
                required
              />
            </Field>
          ) : (
            <Field label="اسم التخصص *">
              <input value={specForm.specName} disabled className={inputCls} />
            </Field>
          )}
          <Field label="الوصف">
            <textarea value={specForm.description} onChange={(e) => setSpecForm((f) => ({ ...f, description: e.target.value }))} rows={2} disabled={!!specForm.centralSpecialtyId && !editSpec} className={inputCls + ' resize-none'} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الترتيب">
              <input type="number" value={specForm.order} onChange={(e) => setSpecForm((f) => ({ ...f, order: e.target.value }))} min={0} className={inputCls} />
            </Field>
            <Field label="المعرف المركزي">
              <input value={specForm.centralSpecialtyId} disabled className={inputCls} dir="ltr" />
            </Field>
          </div>
          <Toggle checked={specForm.isActive} onChange={(v) => setSpecForm((f) => ({ ...f, isActive: v }))} label="التخصص مفعل" />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setSpecModal(false); setEditSpec(null) }} className={btnOutline}>إلغاء</button>
            <button type="submit" disabled={savingSpec} className={btnPrimary}>{savingSpec ? 'جاري الحفظ...' : editSpec ? 'حفظ التعديلات' : 'إضافة'}</button>
          </div>
        </form>
      </Modal>

      {/* Doctor Modal */}
      <Modal isOpen={docModal} onClose={closeDocModal} title={editDoc ? 'تعديل الطبيب' : 'إضافة طبيب'} size="lg">
        <form onSubmit={handleDocSubmit}>
          {/* Tab switcher */}
          <div className="mb-4 flex rounded-lg border border-gray-100 bg-gray-50 p-0.5">
            {[{ key: 'info', label: 'البيانات الأساسية' }, { key: 'schedule', label: 'جدول العمل' }].map((t) => (
              <button key={t.key} type="button" onClick={() => setDocTab(t.key)}
                className={cn('flex-1 rounded-md py-1.5 text-xs font-semibold transition', docTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {t.label}
              </button>
            ))}
          </div>

          {docTab === 'info' && (
            <div className="flex flex-col gap-3">
              {!editDoc ? (
                <Field label="الطبيب *">
                  <Combobox
                    options={centralDoctors}
                    getLabel={(o) => o?.name || o?.docName || ''}
                    value={centralDoctors.find((d) => String(d.id) === String(docForm.centralDoctorId)) || null}
                    onChange={(v) => v ? setDocForm((f) => ({ ...f, docName: v.name || v.docName || '', centralDoctorId: v.id || '', phoneNumber: v.phoneNumber || '', specialization: v.specialization || '' })) : setDocForm((f) => ({ ...f, docName: '', centralDoctorId: '', phoneNumber: '', specialization: '' }))}
                    placeholder="اختر من القائمة المركزية"
                    noOptionsText={centralDoctors.length === 0 ? 'لا يوجد أطباء مركزيين' : 'لا يوجد نتائج'}
                    helperText={centralDoctors.length === 0 ? 'تأكد من وجود بيانات في allDoctors' : ''}
                    required
                  />
                </Field>
              ) : (
                <Field label="اسم الطبيب *"><input value={docForm.docName} disabled className={inputCls} /></Field>
              )}
              <Field label="رقم الهاتف">
                <input name="phoneNumber" value={docForm.phoneNumber} onChange={(e) => setDocForm((f) => ({ ...f, phoneNumber: e.target.value }))} dir="ltr" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="المعرف المركزي"><input value={docForm.centralDoctorId} disabled dir="ltr" className={inputCls} /></Field>
                <Field label="التخصص"><input value={docForm.specialization} disabled dir="ltr" className={inputCls} /></Field>
                <Field label="حد المرضى صباحاً">
                  <input type="number" value={docForm.morningPatientLimit} onChange={(e) => setDocForm((f) => ({ ...f, morningPatientLimit: e.target.value }))} min={0} className={inputCls} />
                </Field>
                <Field label="حد المرضى مساءً">
                  <input type="number" value={docForm.eveningPatientLimit} onChange={(e) => setDocForm((f) => ({ ...f, eveningPatientLimit: e.target.value }))} min={0} className={inputCls} />
                </Field>
              </div>
              <div className="flex gap-6">
                <Toggle checked={docForm.isActive} onChange={(v) => setDocForm((f) => ({ ...f, isActive: v }))} label="الطبيب نشط" />
                <Toggle checked={docForm.isBookingEnabled} onChange={(v) => setDocForm((f) => ({ ...f, isBookingEnabled: v }))} label="الحجز مفتوح" />
              </div>
              {/* Photo upload */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-700">صورة الطبيب</p>
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-blue-50 flex items-center justify-center">
                    {docForm.photoUrl ? <img src={docForm.photoUrl} alt="" className="h-full w-full object-cover" /> : <User className="h-6 w-6 text-blue-400" />}
                  </div>
                  <div>
                    <input id="photo-upload" type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
                    <label htmlFor="photo-upload" className={cn(btnOutline, 'cursor-pointer')}>
                      {uploadingPhoto ? `${uploadProgress}%...` : 'رفع صورة'}
                    </label>
                    {docForm.photoUrl && <p className="mt-1 text-[11px] text-green-600">✓ تم رفع الصورة</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {docTab === 'schedule' && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {scheduleRows.map((row, i) => (
                <div key={row.day} className={cn('border-b border-gray-100 last:border-0', row.enabled ? 'bg-white' : 'bg-gray-50')}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input type="checkbox" checked={row.enabled} onChange={() => toggleDay(i)} className="h-4 w-4 rounded accent-blue-600" />
                    <span className={cn('text-sm font-medium', row.enabled ? 'text-gray-900' : 'text-gray-400')}>{row.day}</span>
                  </div>
                  {row.enabled && (
                    <div className="px-6 pb-2.5 space-y-2">
                      {/* Morning */}
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={row.morning.enabled} onChange={() => toggleShift(i, 'morning')} className="h-3.5 w-3.5 rounded accent-amber-500" />
                          <Sun className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-xs text-gray-600">صباحاً</span>
                        </label>
                        {row.morning.enabled && (
                          <div className="flex items-center gap-1" dir="ltr">
                            <input type="time" value={row.morning.start} onChange={(e) => setShiftTime(i, 'morning', 'start', e.target.value)} className="rounded border border-gray-200 px-1.5 py-0.5 text-xs outline-none focus:border-blue-400" />
                            <span className="text-xs text-gray-400">—</span>
                            <input type="time" value={row.morning.end} onChange={(e) => setShiftTime(i, 'morning', 'end', e.target.value)} className="rounded border border-gray-200 px-1.5 py-0.5 text-xs outline-none focus:border-blue-400" />
                          </div>
                        )}
                      </div>
                      {/* Evening */}
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={row.evening.enabled} onChange={() => toggleShift(i, 'evening')} className="h-3.5 w-3.5 rounded accent-indigo-500" />
                          <Moon className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="text-xs text-gray-600">مساءً</span>
                        </label>
                        {row.evening.enabled && (
                          <div className="flex items-center gap-1" dir="ltr">
                            <input type="time" value={row.evening.start} onChange={(e) => setShiftTime(i, 'evening', 'start', e.target.value)} className="rounded border border-gray-200 px-1.5 py-0.5 text-xs outline-none focus:border-blue-400" />
                            <span className="text-xs text-gray-400">—</span>
                            <input type="time" value={row.evening.end} onChange={(e) => setShiftTime(i, 'evening', 'end', e.target.value)} className="rounded border border-gray-200 px-1.5 py-0.5 text-xs outline-none focus:border-blue-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={closeDocModal} className={btnOutline}>إلغاء</button>
            <button type="submit" disabled={savingDoc || uploadingPhoto} className={cn(btnPrimary, 'bg-green-600 hover:bg-green-700')}>
              {savingDoc ? 'جاري الحفظ...' : editDoc ? 'حفظ التعديلات' : 'إضافة الطبيب'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Appointments Tab ─────────────────────────────────────────────────────────

const AppointmentsTab = ({ facilityId }) => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')
  const [patientSearch, setPatientSearch] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('all')
  const todayStr = formatDate(new Date())

  useEffect(() => {
    getAppointments(facilityId).then(setAppointments).catch(() => toast.error('خطأ')).finally(() => setLoading(false))
  }, [facilityId])

  const handleCancel = async (id) => {
    if (!window.confirm('إلغاء هذا الحجز؟')) return
    const apt = appointments.find((a) => a.id === id)
    setLoading(true)
    try {
      await updateAppointmentStatus(facilityId, id, APPOINTMENT_STATUS.CANCELED)
      toast.success('تم الإلغاء')
      if (apt) {
        Promise.all([
          sendSMS(apt.patientPhone, buildCancelMessage({ patientName: apt.patientName, doctorName: apt.doctorName, date: apt.date, shift: apt.period })),
          sendCancelWhatsApp({ phone: apt.patientPhone, patientName: apt.patientName, doctorName: apt.doctorName, date: apt.date, shift: apt.period }),
        ]).catch(console.error)
      }
      setAppointments(await getAppointments(facilityId))
    } catch { toast.error('حدث خطأ') } finally { setLoading(false) }
  }

  const filtered = appointments.filter((apt) => {
    if (activeTab === 'today' && apt.date !== todayStr) return false
    if (dateFilter && apt.date !== dateFilter) return false
    if (periodFilter !== 'all' && apt.period !== periodFilter) return false
    if (patientSearch.trim()) { const s = patientSearch.toLowerCase(); if (!apt.patientName?.toLowerCase().includes(s) && !apt.patientPhone?.includes(s)) return false }
    if (doctorSearch.trim()) { const s = doctorSearch.toLowerCase(); if (!apt.doctorName?.toLowerCase().includes(s) && !apt.specializationName?.toLowerCase().includes(s)) return false }
    return true
  })

  const hasFilters = patientSearch || doctorSearch || dateFilter || periodFilter !== 'all'
  const clearFilters = () => { setPatientSearch(''); setDoctorSearch(''); setDateFilter(''); setPeriodFilter('all') }
  const doctorOptions = [...new Set([...appointments.map((a) => a.doctorName), ...appointments.map((a) => a.specializationName)].filter(Boolean))]

  if (loading) return <Spinner size="lg" />

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          {/* Today / All toggle */}
          <div className="flex rounded-lg border border-gray-100 bg-gray-50 p-0.5">
            {[
              { key: 'today', label: `اليوم (${appointments.filter((a) => a.date === todayStr).length})` },
              { key: 'all', label: `الكل (${appointments.length})` },
            ].map((t) => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); if (t.key === 'today') setDateFilter('') }}
                className={cn('rounded-md px-3 py-1 text-xs font-semibold transition', activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {t.label}
              </button>
            ))}
          </div>
          {hasFilters && <button onClick={clearFilters} className={cn(btnDanger, 'text-[11px]')}><X className="h-3 w-3" /> مسح الفلاتر</button>}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-40 flex-1">
            <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="اسم المريض أو الهاتف..." className={cn(inputCls, 'pr-8 py-1.5 text-xs')} />
          </div>
          <div className="relative min-w-40 flex-1">
            <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={doctorSearch} onChange={(e) => setDoctorSearch(e.target.value)} placeholder="الطبيب أو التخصص..." list="doctor-options" className={cn(inputCls, 'pr-8 py-1.5 text-xs')} />
            <datalist id="doctor-options">{doctorOptions.map((o) => <option key={o} value={o} />)}</datalist>
          </div>
          {/* Period filter */}
          <div className="flex rounded-lg border border-gray-100 bg-gray-50 p-0.5">
            {[{ k: 'all', l: 'الكل' }, { k: 'morning', l: 'صباحاً', icon: Sun }, { k: 'evening', l: 'مساءً', icon: Moon }].map(({ k, l, icon: Icon }) => (
              <button key={k} onClick={() => setPeriodFilter(k)}
                className={cn('flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition', periodFilter === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
                {Icon && <Icon className="h-3 w-3" />}{l}
              </button>
            ))}
          </div>
          <input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); if (e.target.value) setActiveTab('all') }}
            dir="ltr" className={cn(inputCls, 'w-36 py-1.5 text-xs')} />
        </div>
        {hasFilters && <p className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2">نتائج: <span className="font-bold text-blue-600">{filtered.length}</span> موعد</p>}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center rounded-xl border border-gray-100 bg-white">
          <CalendarDays className="mb-3 h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-400">لا توجد مواعيد تطابق بحثك</p>
          {hasFilters && <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 hover:underline">عرض الكل</button>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                  <th className="px-3 py-2.5 text-right">المريض</th>
                  <th className="hidden px-3 py-2.5 text-right sm:table-cell">الطبيب</th>
                  <th className="hidden px-3 py-2.5 text-center md:table-cell">التاريخ</th>
                  <th className="hidden px-3 py-2.5 text-center md:table-cell">الفترة</th>
                  <th className="px-3 py-2.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-gray-900 text-xs">{apt.patientName || '—'}</p>
                      <p className="text-[11px] text-blue-600" dir="ltr">{apt.patientPhone}</p>
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      <p className="text-xs font-semibold">{apt.doctorName || '—'}</p>
                      <p className="text-[11px] text-gray-400">{apt.specializationName}</p>
                    </td>
                    <td className="hidden px-3 py-2 text-center md:table-cell">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-bold',
                        apt.date === todayStr ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 bg-gray-50 text-gray-600')}>
                        {apt.date || '—'}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 text-center md:table-cell">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                          apt.period === 'morning' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700')}>
                          {apt.period === 'morning' ? <Sun className="h-2.5 w-2.5" /> : <Moon className="h-2.5 w-2.5" />}
                          {apt.period === 'morning' ? 'صباحاً' : 'مساءً'}
                        </span>
                        {(apt.time || apt.timeSlot) && <span className="text-[10px] text-gray-400" dir="ltr">{apt.time || apt.timeSlot}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {apt.status === APPOINTMENT_STATUS.CANCELED
                        ? <span className="text-xs font-bold text-red-500">ملغي</span>
                        : <button onClick={() => handleCancel(apt.id)} className={cn(btnDanger, 'text-[11px] mx-auto')}>إلغاء</button>}
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

// ─── Insurance Tab ────────────────────────────────────────────────────────────

const INS_EMPTY = { name: '', description: '', phone: '', enabled: true }

const InsuranceTab = ({ facilityId }) => {
  const [companies, setCompanies] = useState([])
  const [centralCompanies, setCentralCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(INS_EMPTY)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [fac, central] = await Promise.all([getInsuranceCompanies(facilityId), getCentralInsurance()])
      setCompanies(fac); setCentralCompanies(central)
    } catch { toast.error('خطأ في التحميل') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [facilityId])

  const openAdd = () => { setForm(INS_EMPTY); setEditTarget(null); setModal(true) }
  const openEdit = (c) => { setForm({ ...INS_EMPTY, ...c }); setEditTarget(c); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('الاسم مطلوب'); return }
    setSaving(true)
    try {
      if (editTarget) { await updateFacilityInsurance(facilityId, editTarget.id, form); toast.success('تم التحديث') }
      else { await createFacilityInsurance(facilityId, form); toast.success('تم الإضافة') }
      setModal(false); setEditTarget(null); load()
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`حذف "${c.name}"؟`)) return
    try { await deleteFacilityInsurance(facilityId, c.id); toast.success('تم الحذف'); load() }
    catch { toast.error('حدث خطأ') }
  }

  const handleToggle = async (c) => {
    try { await updateFacilityInsurance(facilityId, c.id, { enabled: !c.enabled }); load() }
    catch { toast.error('حدث خطأ') }
  }

  const filtered = companies.filter((c) => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  if (loading) return <Spinner size="lg" />

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900">شركات التأمين</p>
          <p className="text-xs text-gray-400">{companies.length} شركة</p>
        </div>
        <button onClick={openAdd} className={btnPrimary}><Plus className="h-3.5 w-3.5" /> إضافة شركة</button>
      </div>

      <div className="relative">
        <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="بحث..." className={cn(inputCls, 'pr-8')} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center rounded-xl border border-gray-100 bg-white">
          <Shield className="mb-3 h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-400">{searchTerm ? 'لا توجد نتائج' : 'لا توجد شركات بعد'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                <th className="px-3 py-2.5 text-right">الشركة</th>
                <th className="hidden px-3 py-2.5 text-right sm:table-cell">الهاتف</th>
                <th className="px-3 py-2.5 text-center">الحالة</th>
                <th className="px-3 py-2.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-3 py-2">
                    <p className="text-xs font-semibold">{c.name}</p>
                    {c.description && <p className="text-[11px] text-gray-400 truncate max-w-48">{c.description}</p>}
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell text-xs text-gray-600" dir="ltr">{c.phone || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => handleToggle(c)}
                      className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold',
                        c.enabled !== false ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                      {c.enabled !== false ? 'مفعل' : 'معطل'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(c)} className={iconBtn}><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => handleDelete(c)} className={cn(iconBtn, 'text-red-500 border-red-200 hover:bg-red-50')}><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modal} onClose={() => { setModal(false); setEditTarget(null) }} title={editTarget ? 'تعديل شركة التأمين' : 'إضافة شركة'} size="md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-1">
          {!editTarget ? (
            <Field label="الشركة *">
              <Combobox
                options={centralCompanies}
                getLabel={(o) => o?.name || ''}
                value={centralCompanies.find((c) => c.name === form.name) || null}
                onChange={(v) => v ? setForm((f) => ({ ...f, name: v.name || '', phone: v.phone || v.phoneNumber || '', description: v.description || '', centralId: v.id || '' })) : setForm((f) => ({ ...f, name: '', phone: '', description: '', centralId: '' }))}
                placeholder="اختر من القائمة المركزية"
                noOptionsText={centralCompanies.length === 0 ? 'لا يوجد شركات مركزية' : 'لا يوجد نتائج'}
                required
              />
            </Field>
          ) : (
            <Field label="اسم الشركة *"><input value={form.name} disabled className={inputCls} /></Field>
          )}
          <Field label="رقم الهاتف"><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} dir="ltr" className={inputCls} /></Field>
          <Field label="الوصف"><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={inputCls + ' resize-none'} /></Field>
          <Toggle checked={form.enabled} onChange={(v) => setForm((f) => ({ ...f, enabled: v }))} label="الشركة مفعلة" />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setModal(false); setEditTarget(null) }} className={btnOutline}>إلغاء</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

const USER_EMPTY = { userName: '', userEmail: '', userPhone: '', userPassword: '', userType: 'admin' }
const USER_TYPES = [
  { value: 'admin', label: 'Admin' }, { value: 'doctor', label: 'Doctor' },
  { value: 'callcenter', label: 'Call Center' }, { value: 'reception', label: 'Reception' },
]
const userTypeBadge = (t) => ({ admin: 'border-red-200 bg-red-50 text-red-700', doctor: 'border-blue-200 bg-blue-50 text-blue-700', callcenter: 'border-purple-200 bg-purple-50 text-purple-700', reception: 'border-amber-200 bg-amber-50 text-amber-700' }[t] || 'border-gray-200 bg-gray-50 text-gray-600')

const UsersTab = ({ facilityId }) => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(USER_EMPTY)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const load = async () => { setLoading(true); try { setUsers(await getUsersByFacility(facilityId)) } catch { toast.error('خطأ') } finally { setLoading(false) } }
  useEffect(() => { load() }, [facilityId])

  const openAdd = () => { setForm(USER_EMPTY); setEditTarget(null); setModal(true) }
  const openEdit = (u) => { setForm({ userName: u.userName || '', userEmail: u.email || '', userPhone: u.userPhone || '', userPassword: '', userType: u.userType || 'admin' }); setEditTarget(u); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.userName.trim()) { toast.error('الاسم مطلوب'); return }
    if (!editTarget && !form.userEmail.trim()) { toast.error('البريد مطلوب'); return }
    if (!editTarget && form.userPassword.length < 6) { toast.error('كلمة المرور 6 أحرف على الأقل'); return }
    setSaving(true)
    try {
      if (editTarget) {
        const payload = { userName: form.userName, userPhone: form.userPhone, userType: form.userType }
        if (form.userPassword.trim()) payload.userPassword = form.userPassword
        await updateFacilityUser(editTarget.id, payload); toast.success('تم التحديث')
      } else {
        await adminRegisterUser(form.userEmail, form.userPassword, form.userName, form.userType, facilityId, form.userPhone)
        toast.success('تم إضافة المستخدم')
      }
      setModal(false); setEditTarget(null); load()
    } catch (err) { toast.error(err.message || 'حدث خطأ') } finally { setSaving(false) }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`حذف "${user.userName}"؟`)) return
    try {
      if (user.uid || user.id) { try { await deleteAuthUser(user.uid || user.id) } catch (e) { console.warn(e) } }
      await deleteFacilityUser(user.id); toast.success('تم الحذف'); load()
    } catch { toast.error('حدث خطأ') }
  }

  const filteredUsers = users.filter((u) => {
    const s = searchTerm.toLowerCase()
    const matchSearch = !s || u.userName?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.userPhone?.includes(s)
    const matchType = typeFilter === 'all' || u.userType === typeFilter
    return matchSearch && matchType
  })

  if (loading) return <Spinner size="lg" />

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900">إدارة المستخدمين</p>
          <p className="text-xs text-gray-400">{users.length} مستخدم</p>
        </div>
        <button onClick={openAdd} className={btnPrimary}><Plus className="h-3.5 w-3.5" /> إضافة مستخدم</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="بحث بالاسم أو الإيميل..." className={cn(inputCls, 'pr-8')} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={cn(inputCls, 'w-40')}>
          <option value="all">الكل</option>
          {USER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center rounded-xl border border-gray-100 bg-white">
          <Users className="mb-3 h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-400">لا يوجد مستخدمون</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                <th className="px-3 py-2.5 text-right">المستخدم</th>
                <th className="hidden px-3 py-2.5 text-right md:table-cell">البريد</th>
                <th className="hidden px-3 py-2.5 text-right sm:table-cell">الهاتف</th>
                <th className="hidden px-3 py-2.5 text-center md:table-cell">النوع</th>
                <th className="px-3 py-2.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="relative h-8 w-8 shrink-0">
                        <div className="h-8 w-8 rounded-full bg-blue-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                          {u.photoUrl ? <img src={u.photoUrl} className="h-full w-full object-cover" /> : <User className="h-4 w-4 text-blue-400" />}
                        </div>
                        <span className={cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white', u.isOnline ? 'bg-green-400' : 'bg-gray-300')} />
                      </div>
                      <p className="text-xs font-semibold">{u.displayName || u.userName || '—'}</p>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-gray-600 md:table-cell">{u.email}</td>
                  <td className="hidden px-3 py-2 text-xs text-gray-600 sm:table-cell" dir="ltr">{u.userPhone || '—'}</td>
                  <td className="hidden px-3 py-2 text-center md:table-cell">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', userTypeBadge(u.userType))}>{u.userType || '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(u)} className={iconBtn}><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => handleDelete(u)} className={cn(iconBtn, 'text-red-500 border-red-200 hover:bg-red-50')}><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modal} onClose={() => { setModal(false); setEditTarget(null) }} title={editTarget ? 'تعديل المستخدم' : 'إضافة مستخدم'} size="md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-1">
          <Field label="الاسم الكامل *"><input name="userName" required value={form.userName} onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))} className={inputCls} /></Field>
          <Field label="البريد الإلكتروني *"><input name="userEmail" type="email" required={!editTarget} disabled={!!editTarget} value={form.userEmail} onChange={(e) => setForm((f) => ({ ...f, userEmail: e.target.value }))} dir="ltr" className={inputCls} /></Field>
          <Field label="رقم الهاتف"><input name="userPhone" value={form.userPhone} onChange={(e) => setForm((f) => ({ ...f, userPhone: e.target.value }))} dir="ltr" className={inputCls} /></Field>
          <Field label="نوع المستخدم">
            <select value={form.userType} onChange={(e) => setForm((f) => ({ ...f, userType: e.target.value }))} className={inputCls}>
              {USER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label={editTarget ? 'كلمة المرور (اتركها فارغة للإبقاء)' : 'كلمة المرور *'}>
            <input type="password" required={!editTarget} value={form.userPassword} onChange={(e) => setForm((f) => ({ ...f, userPassword: e.target.value }))} dir="ltr" className={inputCls} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setModal(false); setEditTarget(null) }} className={btnOutline}>إلغاء</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'specializations', label: 'التخصصات', icon: Stethoscope },
  { key: 'appointments', label: 'المواعيد', icon: CalendarDays },
  { key: 'insurance', label: 'التأمين', icon: Shield },
  { key: 'users', label: 'المستخدمون', icon: Users },
]

export default function AdminFacilityDetail() {
  const { facilityId } = useParams()
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('specializations')

  useEffect(() => {
    getFacilityById(facilityId).then(setFacility).catch(() => toast.error('خطأ')).finally(() => setLoading(false))
  }, [facilityId])

  if (loading) return <Spinner size="lg" />

  if (!facility) return (
    <div className="flex flex-col items-center py-20 text-center">
      <Building2 className="mb-3 h-16 w-16 text-gray-200" />
      <p className="text-sm text-gray-400">المنشأة غير موجودة</p>
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 md:px-6">

      {/* Facility header */}
      <div className="mb-4 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-blue-50 flex items-center justify-center">
          {facility.imageUrl ? <img src={facility.imageUrl} alt={facility.name} className="h-full w-full object-contain p-1" /> : <Building2 className="h-7 w-7 text-blue-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-base font-bold text-gray-900">{facility.name}</h1>
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', facility.available ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600')}>
              {facility.available ? 'نشط' : 'معطل'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {facility.address && (
              <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="h-3 w-3" />{facility.address}</span>
            )}
            {facility.phone && (
              <span className="flex items-center gap-1 text-xs text-gray-400" dir="ltr"><Phone className="h-3 w-3" />{facility.phone}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 pb-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition',
              activeTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {activeTab === 'specializations' && <SpecializationsTab facilityId={facilityId} />}
      {activeTab === 'appointments' && <AppointmentsTab facilityId={facilityId} />}
      {activeTab === 'insurance' && <InsuranceTab facilityId={facilityId} />}
      {activeTab === 'users' && <UsersTab facilityId={facilityId} facilityName={facility.name} />}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { formatDate } from '../../utils/bookingUtils'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import DialogActions from '@mui/material/DialogActions'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Autocomplete from '@mui/material/Autocomplete'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import ShieldIcon from '@mui/icons-material/Shield'
import PeopleIcon from '@mui/icons-material/People'
import PersonIcon from '@mui/icons-material/Person'
import EventIcon from '@mui/icons-material/Event'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import ClearIcon from '@mui/icons-material/Clear'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PhoneIcon from '@mui/icons-material/Phone'
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
import { getUsersByFacility, createFacilityUser, updateFacilityUser, deleteFacilityUser, deleteAuthUser } from '../../services/userService'
import { adminRegisterUser } from '../../services/authService'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../../services/firebase'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'

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

  const loadSpecs = async () => {
    setLoading(true)
    try {
      const data = await getSpecializations(facilityId)
      setSpecs([...data].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)))
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

  const openDoctorsDialog = (spec) => { setDoctorsDialogSpec(spec); loadDoctors(spec.id) }
  const closeDoctorsDialog = () => setDoctorsDialogSpec(null)

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
      if (editSpec) { await updateSpecialization(facilityId, editSpec.id, payload); toast.success('تم تحديث التخصص') }
      else { await createSpecialization(facilityId, payload); toast.success('تم إضافة التخصص') }
      closeSpecModal(); loadSpecs()
    } catch { toast.error('حدث خطأ، يرجى المحاولة') }
    finally { setSavingSpec(false) }
  }

  const handleDeleteSpec = async (spec) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${spec.specName}"؟`)) return
    try { await deleteSpecialization(facilityId, spec.id); toast.success('تم حذف التخصص'); loadSpecs() }
    catch { toast.error('حدث خطأ أثناء الحذف') }
  }

  const handleToggleSpec = async (spec) => {
    try { await updateSpecialization(facilityId, spec.id, { isActive: !spec.isActive }); toast.success(spec.isActive ? 'تم إيقاف التخصص' : 'تم تفعيل التخصص'); loadSpecs() }
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

  const handleDocField = (e) => {
    const { name, value, type, checked } = e.target
    setDocForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const path = `${facilityId}/doctors/images/${Date.now()}-${file.name}`
    const sRef = storageRef(storage, path)
    const task = uploadBytesResumable(sRef, file)
    setUploadingPhoto(true)
    setUploadProgress(0)
    task.on('state_changed',
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => { toast.error('فشل رفع الصورة'); setUploadingPhoto(false) },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        setDocForm((f) => ({ ...f, photoUrl: url }))
        setUploadingPhoto(false)
        toast.success('تم رفع الصورة')
      }
    )
  }

  const toggleDay = (i) => setScheduleRows((rows) => rows.map((r, idx) => idx === i ? { ...r, enabled: !r.enabled } : r))
  const toggleShift = (dayIdx, shift) => setScheduleRows((rows) => rows.map((r, idx) => idx === dayIdx ? { ...r, [shift]: { ...r[shift], enabled: !r[shift].enabled } } : r))
  const setShiftTime = (dayIdx, shift, field, val) => setScheduleRows((rows) => rows.map((r, idx) => idx === dayIdx ? { ...r, [shift]: { ...r[shift], [field]: val } } : r))

  const handleDocSubmit = async (e) => {
    e.preventDefault()
    if (!docForm.docName.trim()) { toast.error('اسم الطبيب مطلوب'); return }
    setSavingDoc(true)
    try {
      const payload = { ...docForm, morningPatientLimit: Number(docForm.morningPatientLimit) || 0, eveningPatientLimit: Number(docForm.eveningPatientLimit) || 0, workingSchedule: rowsToSchedule(scheduleRows) }
      if (editDoc) { await updateDoctorInSpec(facilityId, docSpecId, editDoc.id, payload); toast.success('تم تحديث الطبيب') }
      else { await addDoctorToSpec(facilityId, docSpecId, payload); toast.success('تم إضافة الطبيب') }
      closeDocModal()
      setDoctorsBySpec((p) => ({ ...p, [docSpecId]: undefined }))
      setTimeout(() => loadDoctors(docSpecId), 100)
    } catch { toast.error('حدث خطأ، يرجى المحاولة') }
    finally { setSavingDoc(false) }
  }

  const handleDeleteDoc = async (specId, doctor) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${doctor.docName}"؟`)) return
    try {
      await deleteDoctorFromSpec(facilityId, specId, doctor.id); toast.success('تم حذف الطبيب')
      setDoctorsBySpec((p) => ({ ...p, [specId]: undefined })); loadDoctors(specId)
    } catch { toast.error('حدث خطأ أثناء الحذف') }
  }

  const handleToggleDoc = async (specId, doctor, field) => {
    try {
      await updateDoctorInSpec(facilityId, specId, doctor.id, { [field]: !doctor[field] })
      setDoctorsBySpec((p) => ({ ...p, [specId]: (p[specId] || []).map((d) => d.id === doctor.id ? { ...d, [field]: !doctor[field] } : d) }))
    } catch { toast.error('حدث خطأ') }
  }

  if (loading) return <Spinner size="lg" />

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">{specs.length} تخصص</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAddSpec} size="small">إضافة تخصص</Button>
      </Box>

      {specs.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 10 }}>
          <MedicalServicesIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">لا توجد تخصصات بعد</Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {specs.map((spec) => {
            const doctors = doctorsBySpec[spec.id] || []
            return (
              <Grid item xs={12} sm={6} lg={4} key={spec.id}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column',width:200 }}>
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                 
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip label={spec.isActive !== false ? 'مفعل' : 'معطل'} size="small" color={spec.isActive !== false ? 'success' : 'warning'} onClick={() => handleToggleSpec(spec)} sx={{ cursor: 'pointer' }} />
                        <IconButton size="small" color="primary" onClick={() => openEditSpec(spec)}><EditIcon fontSize="small" /></IconButton>
                        {/* <IconButton size="small" color="error" onClick={() => handleDeleteSpec(spec)}><DeleteIcon fontSize="small" /></IconButton> */}
                      </Stack>
                    </Box>
                    <Box>
                      <Typography fontWeight={700}>{spec.specName}</Typography>
                      <Typography variant="caption" color="text.secondary">{spec.description || 'لا يوجد وصف'}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {/* <Chip size="small" label={`${doctors.length} أطباء`} variant="outlined" icon={<PersonIcon />} /> */}
                      {spec.order != null && <Chip size="small" label={`ترتيب: ${spec.order}`} variant="outlined" />}
                    </Stack>
                  </Box>
                  <Box sx={{ borderTop: 1, borderColor: 'divider', px: 2, py: 1 }}>
                    <Button fullWidth size="small" startIcon={<PeopleIcon />} onClick={() => openDoctorsDialog(spec)}>
                      إدارة الأطباء
                    </Button>
                  </Box>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Doctors Dialog */}
      <Dialog open={!!doctorsDialogSpec} onClose={closeDoctorsDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontWeight: 700, fontSize: '1rem' }}>
              {doctorsDialogSpec?.specName?.charAt(0)}
            </Avatar>
            <Box>
              <Typography fontWeight={700}>{doctorsDialogSpec?.specName}</Typography>
              <Typography variant="caption" color="text.secondary">
                {(doctorsBySpec[doctorsDialogSpec?.id] || []).length} أطباء
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button size="small" variant="contained" color="success" startIcon={<AddIcon />}
              onClick={() => openAddDoc(doctorsDialogSpec.id, doctorsDialogSpec.centralSpecialtyId)}>
              إضافة طبيب
            </Button>
            <IconButton size="small" onClick={closeDoctorsDialog}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 2 }}>
          {loadingDoctors[doctorsDialogSpec?.id] ? (
            <Spinner size="sm" />
          ) : (doctorsBySpec[doctorsDialogSpec?.id] || []).length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              لا يوجد أطباء في هذا التخصص
            </Typography>
          ) : (
            <Stack spacing={1}>
              {(doctorsBySpec[doctorsDialogSpec?.id] || []).map((doctor) => (
                <Card key={doctor.id} variant="outlined">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
                    <Avatar
                      src={doctor.photoUrl || undefined}
                      sx={{ width: 56, height: 56, bgcolor: 'primary.50', border: 1, borderColor: 'divider' }}
                      imgProps={{ style: { objectFit: 'cover' } }}
                    >
                      <PersonIcon color="primary" />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{doctor.docName}</Typography>
                      {doctor.phoneNumber && <Typography variant="caption" color="text.secondary" dir="ltr">{doctor.phoneNumber}</Typography>}
                      <Typography variant="caption" color="text.disabled" display="block">
                        ص: {doctor.morningPatientLimit} | م: {doctor.eveningPatientLimit}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                      <Chip label={doctor.isActive !== false ? 'نشط' : 'معطل'} size="small" color={doctor.isActive !== false ? 'success' : 'warning'} onClick={() => handleToggleDoc(doctorsDialogSpec.id, doctor, 'isActive')} sx={{ cursor: 'pointer' }} />
                      <Chip label={doctor.isBookingEnabled ? 'حجز مفتوح' : 'حجز مغلق'} size="small" color={doctor.isBookingEnabled ? 'primary' : 'default'} onClick={() => handleToggleDoc(doctorsDialogSpec.id, doctor, 'isBookingEnabled')} sx={{ cursor: 'pointer' }} />
                      <IconButton size="small" color="primary" onClick={() => openEditDoc(doctorsDialogSpec.id, doctor)}><EditIcon fontSize="small" /></IconButton>
                      {/* <IconButton size="small" color="error" onClick={() => handleDeleteDoc(doctorsDialogSpec.id, doctor)}><DeleteIcon fontSize="small" /></IconButton> */}
                    </Stack>
                  </Box>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Specialization Modal */}
      <Modal isOpen={specModal} onClose={closeSpecModal} title={editSpec ? 'تعديل التخصص' : 'إضافة تخصص جديد'} size="md">
        <Box component="form" onSubmit={handleSpecSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField label="اسم التخصص *" name="specName" value={specForm.specName} onChange={handleSpecField} required fullWidth placeholder="طب عام..." />
          <TextField label="الوصف" name="description" value={specForm.description} onChange={handleSpecField} fullWidth multiline rows={2} />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField label="الترتيب" name="order" type="number" value={specForm.order} onChange={handleSpecField} fullWidth inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="معرّف التخصص المركزي" name="centralSpecialtyId" value={specForm.centralSpecialtyId} onChange={handleSpecField} fullWidth inputProps={{ dir: 'ltr' }} />
            </Grid>
          </Grid>
          <FormControlLabel control={<Switch name="isActive" checked={specForm.isActive} onChange={handleSpecField} />} label="التخصص مفعل" />
          <DialogActions sx={{ px: 0, pb: 0 }}>
            <Button onClick={closeSpecModal} variant="outlined" color="inherit">إلغاء</Button>
            <Button type="submit" variant="contained" disabled={savingSpec}>{savingSpec ? 'جاري الحفظ...' : editSpec ? 'حفظ التعديلات' : 'إضافة التخصص'}</Button>
          </DialogActions>
        </Box>
      </Modal>

      {/* Doctor Modal */}
      <Modal isOpen={docModal} onClose={closeDocModal} title={editDoc ? 'تعديل الطبيب' : 'إضافة طبيب'} size="lg">
        <Box component="form" onSubmit={handleDocSubmit}>
          {/* Tab switcher */}
          <Stack direction="row" spacing={0.5} sx={{ bgcolor: 'grey.100', p: 0.5, borderRadius: 2, mb: 3 }}>
            {[{ key: 'info', label: 'البيانات الأساسية' }, { key: 'schedule', label: 'جدول العمل' }].map((t) => (
              <Button key={t.key} size="small" fullWidth
                variant={docTab === t.key ? 'contained' : 'text'}
                onClick={() => setDocTab(t.key)}
                sx={{ borderRadius: 1.5, color: docTab === t.key ? undefined : 'text.secondary' }}>
                {t.label}
              </Button>
            ))}
          </Stack>

          {/* Basic info panel */}
          {docTab === 'info' && (
            <Stack spacing={2}>
              <TextField label="اسم الطبيب *" name="docName" value={docForm.docName} onChange={handleDocField} required fullWidth placeholder="د. محمد..." />
              <TextField label="رقم الهاتف" name="phoneNumber" value={docForm.phoneNumber} onChange={handleDocField} fullWidth inputProps={{ dir: 'ltr' }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField label="معرّف الطبيب المركزي" name="centralDoctorId" value={docForm.centralDoctorId} onChange={handleDocField} fullWidth inputProps={{ dir: 'ltr' }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="معرّف التخصص" name="specialization" value={docForm.specialization} onChange={handleDocField} fullWidth inputProps={{ dir: 'ltr' }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="حد المرضى الصباحي" name="morningPatientLimit" type="number" value={docForm.morningPatientLimit} onChange={handleDocField} fullWidth inputProps={{ min: 0 }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="حد المرضى المسائي" name="eveningPatientLimit" type="number" value={docForm.eveningPatientLimit} onChange={handleDocField} fullWidth inputProps={{ min: 0 }} />
                </Grid>
              </Grid>
              <Stack direction="row" spacing={2}>
                <FormControlLabel control={<Switch name="isActive" checked={docForm.isActive} onChange={handleDocField} />} label="الطبيب نشط" />
                <FormControlLabel control={<Switch name="isBookingEnabled" checked={docForm.isBookingEnabled} onChange={handleDocField} />} label="الحجز مفتوح" />
              </Stack>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>صورة الطبيب</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={docForm.photoUrl || undefined} sx={{ width: 72, height: 72, bgcolor: 'primary.50', border: 1, borderColor: 'divider' }}>
                    <PersonIcon color="primary" />
                  </Avatar>
                  <Box>
                    <input id="photo-upload" type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
                    <label htmlFor="photo-upload">
                      <Button component="span" variant="outlined" size="small" disabled={uploadingPhoto}>
                        {uploadingPhoto ? `جاري الرفع ${uploadProgress}%` : 'رفع صورة'}
                      </Button>
                    </label>
                    {docForm.photoUrl && <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>تم رفع الصورة ✓</Typography>}
                  </Box>
                </Stack>
              </Box>
            </Stack>
          )}

          {/* Schedule panel */}
          {docTab === 'schedule' && (
            <Card variant="outlined">
              {scheduleRows.map((row, i) => (
                <Box key={row.day}>
                  <Box sx={{ px: 2, py: 1.5, bgcolor: row.enabled ? 'background.paper' : 'grey.50' }}>
                    <FormControlLabel
                      control={<Checkbox checked={row.enabled} onChange={() => toggleDay(i)} size="small" />}
                      label={<Typography variant="body2" fontWeight={row.enabled ? 600 : 400} color={row.enabled ? 'text.primary' : 'text.disabled'}>{row.day}</Typography>}
                    />
                    {row.enabled && (
                      <Box sx={{ mr: 4, mt: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap">
                          <FormControlLabel
                            control={<Checkbox checked={row.morning.enabled} onChange={() => toggleShift(i, 'morning')} size="small" color="warning" />}
                            label={<Stack direction="row" spacing={0.5} alignItems="center"><WbSunnyIcon sx={{ fontSize: 14, color: 'warning.main' }} /><Typography variant="caption">صباحي</Typography></Stack>}
                          />
                          {row.morning.enabled && (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <TextField type="time" value={row.morning.start} onChange={(e) => setShiftTime(i, 'morning', 'start', e.target.value)} size="small" inputProps={{ dir: 'ltr' }} sx={{ width: 110 }} />
                              <Typography variant="caption">—</Typography>
                              <TextField type="time" value={row.morning.end} onChange={(e) => setShiftTime(i, 'morning', 'end', e.target.value)} size="small" inputProps={{ dir: 'ltr' }} sx={{ width: 110 }} />
                            </Stack>
                          )}
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <FormControlLabel
                            control={<Checkbox checked={row.evening.enabled} onChange={() => toggleShift(i, 'evening')} size="small" color="secondary" />}
                            label={<Stack direction="row" spacing={0.5} alignItems="center"><NightsStayIcon sx={{ fontSize: 14, color: 'secondary.main' }} /><Typography variant="caption">مسائي</Typography></Stack>}
                          />
                          {row.evening.enabled && (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <TextField type="time" value={row.evening.start} onChange={(e) => setShiftTime(i, 'evening', 'start', e.target.value)} size="small" inputProps={{ dir: 'ltr' }} sx={{ width: 110 }} />
                              <Typography variant="caption">—</Typography>
                              <TextField type="time" value={row.evening.end} onChange={(e) => setShiftTime(i, 'evening', 'end', e.target.value)} size="small" inputProps={{ dir: 'ltr' }} sx={{ width: 110 }} />
                            </Stack>
                          )}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                  {i < scheduleRows.length - 1 && <Divider />}
                </Box>
              ))}
            </Card>
          )}

          <DialogActions sx={{ px: 0, pt: 2, pb: 0 }}>
            <Button onClick={closeDocModal} variant="outlined" color="inherit">إلغاء</Button>
            <Button type="submit" variant="contained" color="success" disabled={savingDoc || uploadingPhoto}>
              {savingDoc ? 'جاري الحفظ...' : editDoc ? 'حفظ التعديلات' : 'إضافة الطبيب'}
            </Button>
          </DialogActions>
        </Box>
      </Modal>
    </Box>
  )
}

// ─── Appointments Tab ──────────────────────────────────────────────────────────

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
    getAppointments(facilityId)
      .then(setAppointments)
      .catch(() => toast.error('حدث خطأ أثناء تحميل المواعيد'))
      .finally(() => setLoading(false))
  }, [facilityId])

  const filteredAppointments = appointments.filter((apt) => {
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

  const counts = {
    today: appointments.filter((a) => a.date === todayStr).length,
    all: appointments.length,
    filtered: filteredAppointments.length,
  }

  const hasFilters = patientSearch || doctorSearch || dateFilter || periodFilter !== 'all'

  const clearFilters = () => { setPatientSearch(''); setDoctorSearch(''); setDateFilter(''); setPeriodFilter('all') }

  if (loading) return <Spinner size="lg" />

  return (
    <Stack spacing={2}>
      {/* Filter toolbar */}
      <Card variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2} alignItems={{ xl: 'center' }} justifyContent="space-between">
            {/* Tab toggle */}
            <Stack direction="row" spacing={0.5} sx={{ bgcolor: 'grey.100', p: 0.5, borderRadius: 2, width: { xs: '100%', xl: 'auto' } }}>
              {[
                { key: 'today', label: `مواعيد اليوم (${counts.today})` },
                { key: 'all', label: `جميع المواعيد (${counts.all})` },
              ].map((t) => (
                <Button key={t.key} size="small" variant={activeTab === t.key ? 'contained' : 'text'} onClick={() => { setActiveTab(t.key); if (t.key === 'today') setDateFilter('') }}
                  sx={{ flex: 1, borderRadius: 1.5, color: activeTab === t.key ? undefined : 'text.secondary' }}>
                  {t.label}
                </Button>
              ))}
            </Stack>

            {/* Search controls */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flex={1} justifyContent="flex-end" flexWrap="wrap">
              <TextField size="small" placeholder="اسم المريض أو الهاتف..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment> }} sx={{ minWidth: 180 }} />
              <Autocomplete
                size="small"
                freeSolo
                options={[
                  ...new Set([
                    ...appointments.map((a) => a.doctorName).filter(Boolean),
                    ...appointments.map((a) => a.specializationName).filter(Boolean),
                  ])
                ]}
                inputValue={doctorSearch}
                onInputChange={(_, val) => setDoctorSearch(val)}
                sx={{ minWidth: 200 }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="الطبيب أو التخصص..."
                    InputProps={{ ...params.InputProps, startAdornment: <InputAdornment position="start"><MedicalServicesIcon fontSize="small" /></InputAdornment> }}
                  />
                )}
              />

              <ToggleButtonGroup size="small" value={periodFilter} exclusive onChange={(_, v) => v && setPeriodFilter(v)}>
                <ToggleButton value="all">الكل</ToggleButton>
                <ToggleButton value="morning"><WbSunnyIcon fontSize="small" sx={{ mr: 0.5 }} />صباحاً</ToggleButton>
                <ToggleButton value="evening"><NightsStayIcon fontSize="small" sx={{ mr: 0.5 }} />مساءً</ToggleButton>
              </ToggleButtonGroup>

              <TextField type="date" size="small" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); if (e.target.value) setActiveTab('all') }} sx={{ width: 160 }} inputProps={{ dir: 'ltr' }} />

              {hasFilters && (
                <IconButton size="small" color="error" onClick={clearFilters} title="إعادة ضبط الفلاتر"><ClearIcon /></IconButton>
              )}
            </Stack>
          </Stack>

          {hasFilters && (
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">نتائج البحث: <Box component="span" color="primary.main" fontWeight={700}>{counts.filtered}</Box> موعد</Typography>
              {periodFilter !== 'all' && (
                <Chip size="small" icon={periodFilter === 'morning' ? <WbSunnyIcon /> : <NightsStayIcon />}
                  label={periodFilter === 'morning' ? 'صباحاً' : 'مساءً'}
                  color={periodFilter === 'morning' ? 'warning' : 'secondary'} variant="outlined" />
              )}
            </Stack>
          )}
        </Stack>
      </Card>

      {filteredAppointments.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 10 }}>
          <EventIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">لا توجد مواعيد تطابق بحثك</Typography>
          {hasFilters && <Button onClick={clearFilters} size="small" sx={{ mt: 1 }}>عرض جميع المواعيد</Button>}
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>المريض</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>الطبيب</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>التاريخ</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>الوقت</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAppointments.map((apt) => (
                  <TableRow key={apt.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{apt.patientName || '—'}</Typography>
                      <Typography variant="caption" color="primary" dir="ltr">{apt.patientPhone || ''}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" fontWeight={600}>{apt.doctorName || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{apt.specializationName || ''}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Chip size="small" label={apt.date || '—'} color={apt.date === todayStr ? 'error' : 'default'} variant={apt.date === todayStr ? 'filled' : 'outlined'} sx={{ fontSize: '0.75rem' }} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Chip size="small" icon={apt.period === 'morning' ? <WbSunnyIcon /> : <NightsStayIcon />}
                        label={apt.period === 'morning' ? 'صباحاً' : apt.period === 'evening' ? 'مساءً' : '—'}
                        color={apt.period === 'morning' ? 'warning' : 'secondary'} variant="outlined" />
                      <Typography variant="caption" display="block" dir="ltr">{apt.time || apt.timeSlot || ''}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Stack>
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
  const [searchTerm, setSearchTerm] = useState('')

  const load = async () => {
    setLoading(true)
    try { setCompanies(await getInsuranceCompanies(facilityId)) }
    catch { toast.error('حدث خطأ أثناء تحميل شركات التأمين') }
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
      if (editTarget) { await updateFacilityInsurance(facilityId, editTarget.id, form); toast.success('تم تحديث الشركة') }
      else { await createFacilityInsurance(facilityId, form); toast.success('تم إضافة الشركة') }
      closeModal(); load()
    } catch { toast.error('حدث خطأ، يرجى المحاولة') }
    finally { setSaving(false) }
  }

  const handleDelete = async (company) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${company.name}"؟`)) return
    try { await deleteFacilityInsurance(facilityId, company.id); toast.success('تم حذف الشركة'); load() }
    catch { toast.error('حدث خطأ أثناء الحذف') }
  }

  const handleToggle = async (company) => {
    try { await updateFacilityInsurance(facilityId, company.id, { enabled: !company.enabled }); toast.success(company.enabled ? 'تم إيقاف الشركة' : 'تم تفعيل الشركة'); load() }
    catch { toast.error('حدث خطأ') }
  }

  const filtered = companies.filter((c) => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading) return <Spinner size="lg" />

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>شركات التأمين</Typography>
          <Typography variant="body2" color="text.secondary">{companies.length} شركة مسجلة للمركز</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>إضافة شركة تأمين</Button>
      </Box>

      <TextField size="small" placeholder="ابحث باسم شركة التأمين..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

      {filtered.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 10 }}>
          <ShieldIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">{searchTerm ? 'لا توجد نتائج تطابق بحثك' : 'لا توجد شركات تأمين بعد'}</Typography>
          {searchTerm && <Button onClick={() => setSearchTerm('')} size="small" sx={{ mt: 1 }}>عرض جميع الشركات</Button>}
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الشركة</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>الهاتف</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>الوصف</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell><Typography fontWeight={600}>{c.name}</Typography></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }} dir="ltr">
                      <Typography variant="body2">{c.phone || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, maxWidth: 200 }}>
                      <Typography noWrap variant="body2" color="text.secondary">{c.description || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={c.enabled !== false ? 'مفعل' : 'معطل'} size="small" color={c.enabled !== false ? 'success' : 'warning'} onClick={() => handleToggle(c)} sx={{ cursor: 'pointer' }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" color="primary" onClick={() => openEdit(c)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(c)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Modal isOpen={modal} onClose={closeModal} title={editTarget ? 'تعديل شركة التأمين' : 'إضافة شركة تأمين'} size="md">
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField label="اسم الشركة *" name="name" value={form.name} onChange={handleField} required fullWidth />
          <TextField label="رقم الهاتف" name="phone" value={form.phone} onChange={handleField} fullWidth inputProps={{ dir: 'ltr' }} />
          <TextField label="الوصف" name="description" value={form.description} onChange={handleField} fullWidth multiline rows={2} />
          <FormControlLabel control={<Switch name="enabled" checked={form.enabled} onChange={handleField} />} label="الشركة مفعلة" />
          <DialogActions sx={{ px: 0, pb: 0 }}>
            <Button onClick={closeModal} variant="outlined" color="inherit">إلغاء</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة الشركة'}</Button>
          </DialogActions>
        </Box>
      </Modal>
    </Stack>
  )
}

// ─── Users Tab ─────────────────────────────────────────────────────────────────

const USER_EMPTY = { userName: '', userEmail: '', userPhone: '', userPassword: '', userType: 'admin' }
const USER_TYPES = [
  { value: 'all', label: 'الكل' },
  { value: 'admin', label: 'Admin' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'callcenter', label: 'Call Center' },
  { value: 'reception', label: 'Reception' },
]

const UsersTab = ({ facilityId, facilityName }) => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(USER_EMPTY)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    try { setUsers(await getUsersByFacility(facilityId)) }
    catch { toast.error('حدث خطأ أثناء تحميل المستخدمين') }
    setLoading(false)
  }

  useEffect(() => { load() }, [facilityId])

  const handleField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const openAdd = () => { setForm(USER_EMPTY); setEditTarget(null); setModal(true) }
  const openEdit = (u) => { setForm({ userName: u.userName || '', userEmail: u.email || '', userPhone: u.userPhone || '', userPassword: '', userType: u.userType || 'admin' }); setEditTarget(u); setModal(true) }
  const closeModal = () => { setModal(false); setEditTarget(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.userName.trim()) { toast.error('اسم المستخدم مطلوب'); return }
    if (!editTarget && !form.userEmail.trim()) { toast.error('البريد الإلكتروني مطلوب'); return }
    if (!editTarget && form.userPassword.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }

    setSaving(true)
    try {
      if (editTarget) {
        const payload = { userName: form.userName, userPhone: form.userPhone, userType: form.userType }
        if (form.userPassword.trim()) payload.userPassword = form.userPassword
        await updateFacilityUser(editTarget.id, payload); toast.success('تم تحديث المستخدم')
      } else {
        // Create Auth account and Firestore profile in one call (without logout)
        await adminRegisterUser(
          form.userEmail,
          form.userPassword,
          form.userName,
          form.userType,
          facilityId
        )
        toast.success('تم إضافة المستخدم وإنشاء الحساب')
      }
      closeModal(); load()
    } catch (err) {
      toast.error(err.message || 'حدث خطأ، يرجى المحاولة')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${user.userName}"؟ سيتم إلغاء حساب الدخول نهائياً.`)) return
    try {
      // 1. Delete from Auth (via Local API) if UID is available
      if (user.uid || user.id) {
        try { await deleteAuthUser(user.uid || user.id) }
        catch (e) { console.warn('Auth deletion failed/skipped:', e) }
      }
      // 2. Delete from Firestore
      await deleteFacilityUser(user.id);
      toast.success('تم حذف المستخدم وإلغاء الحساب')
      load()
    } catch { toast.error('حدث خطأ أثناء الحذف') }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.userPhone?.includes(searchTerm)
    const matchesType = typeFilter === 'all' || u.userType === typeFilter
    return matchesSearch && matchesType
  })

  const userTypeColor = (type) => ({ admin: 'error', doctor: 'primary', callcenter: 'secondary', reception: 'warning' }[type] || 'default')

  if (loading) return <Spinner size="lg" />

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>إدارة المستخدمين</Typography>
          <Typography variant="body2" color="text.secondary">{users.length} مستخدم مسجل للمركز</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>إضافة مستخدم جديد</Button>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <TextField size="small" placeholder="ابحث بالاسم، الإيميل أو الهاتف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} sx={{ flex: 1 }} />
        <TextField select size="small" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 140 }} label="نوع المستخدم">
          {USER_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </TextField>
      </Stack>

      {filteredUsers.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 10 }}>
          <PeopleIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">{searchTerm || typeFilter !== 'all' ? 'لا توجد نتائج تطابق بحثك' : 'لا يوجد مستخدمون بعد'}</Typography>
          {(searchTerm || typeFilter !== 'all') && <Button onClick={() => { setSearchTerm(''); setTypeFilter('all') }} size="small" sx={{ mt: 1 }}>إعادة تعيين الفلاتر</Button>}
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>المستخدم</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>الاتصال</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>النوع</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>آخر ظهور</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ position: 'relative' }}>
                          <Avatar src={u.photoUrl} sx={{ width: 40, height: 40, bgcolor: 'primary.100' }}>
                            <PersonIcon fontSize="small" color="primary" />
                          </Avatar>
                          <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', bgcolor: u.isOnline ? 'success.main' : 'grey.400', border: '2px solid white' }} />
                        </Box>
                        <Box>
                          <Typography fontWeight={600}>{u.userName}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 150 }}>{u.email || u.userEmail}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }} dir="ltr">
                      <Typography variant="body2">{u.userPhone || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Chip label={u.userType || '—'} size="small" color={userTypeColor(u.userType)} variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="caption" color="text.secondary">
                        {u.lastSeenAt?.toDate ? new Date(u.lastSeenAt.toDate()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'غير متوفر'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" color="primary" onClick={() => openEdit(u)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(u)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Modal isOpen={modal} onClose={closeModal} title={editTarget ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'} size="md">
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField label="الاسم الكامل *" name="userName" value={form.userName} onChange={handleField} required fullWidth />
          <TextField label="البريد الإلكتروني *" name="userEmail" type="email" value={form.userEmail} onChange={handleField} required={!editTarget} disabled={!!editTarget} fullWidth inputProps={{ dir: 'ltr' }} />
          <TextField label="رقم الهاتف" name="userPhone" value={form.userPhone} onChange={handleField} fullWidth inputProps={{ dir: 'ltr' }} />
          <TextField select label="نوع المستخدم" name="userType" value={form.userType} onChange={handleField} fullWidth>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="doctor">Doctor</MenuItem>
            <MenuItem value="callcenter">Call Center</MenuItem>
            <MenuItem value="reception">Reception</MenuItem>
          </TextField>
          <TextField type="password" label={editTarget ? 'كلمة المرور (اتركها فارغة للإبقاء على الحالية)' : 'كلمة المرور *'} name="userPassword" value={form.userPassword} onChange={handleField} required={!editTarget} fullWidth inputProps={{ dir: 'ltr' }} />
          <DialogActions sx={{ px: 0, pb: 0 }}>
            <Button onClick={closeModal} variant="outlined" color="inherit">إلغاء</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة المستخدم'}</Button>
          </DialogActions>
        </Box>
      </Modal>
    </Stack>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'specializations', label: 'التخصصات', icon: <MedicalServicesIcon fontSize="small" /> },
  { key: 'appointments', label: 'المواعيد', icon: <EventIcon fontSize="small" /> },
  { key: 'insurance', label: 'شركات التأمين', icon: <ShieldIcon fontSize="small" /> },
  { key: 'users', label: 'المستخدمون', icon: <PeopleIcon fontSize="small" /> },
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

  if (loading) return <Spinner size="lg" />

  if (!facility) return (
    <Box textAlign="center" py={16}>
      <LocalHospitalIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
      <Typography color="text.secondary">المرفق غير موجود</Typography>
    </Box>
  )

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
      {/* Back link */}
      <Button component={Link} to="/superadmin" startIcon={<ArrowBackIcon />} color="inherit" size="small" sx={{ mb: 2, color: 'text.secondary' }}>
        العودة إلى لوحة التحكم
      </Button>

      {/* Facility header */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Avatar src={facility.imageUrl} sx={{ width: { xs: 56, sm: 72 }, height: { xs: 56, sm: 72 }, bgcolor: 'primary.100', borderRadius: 3, flexShrink: 0 }}>
              <LocalHospitalIcon color="primary" sx={{ fontSize: 32 }} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
                <Typography variant="h6" fontWeight={700}>{facility.name}</Typography>
                <Chip label={facility.available ? 'نشط' : 'معطل'} size="small" color={facility.available ? 'success' : 'error'} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }}>
                {facility.address && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <LocationOnIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">{facility.address}</Typography>
                  </Stack>
                )}
                {facility.phone && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <PhoneIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary" dir="ltr">{facility.phone}</Typography>
                  </Stack>
                )}
              </Stack>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
          {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} icon={t.icon} iconPosition="start" />)}
        </Tabs>
      </Box>

      {/* Tab content */}
      {activeTab === 'specializations' && <SpecializationsTab facilityId={facilityId} />}
      {activeTab === 'appointments' && <AppointmentsTab facilityId={facilityId} />}
      {activeTab === 'insurance' && <InsuranceTab facilityId={facilityId} />}
      {activeTab === 'users' && <UsersTab facilityId={facilityId} facilityName={facility.name} />}
    </Box>
  )
}

export default AdminFacilityDetail

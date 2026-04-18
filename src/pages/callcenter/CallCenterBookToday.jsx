import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getSpecializations, getDoctorsBySpec } from '../../services/facilityService'
import { getBookedSlots, createCallCenterAppointment, updateAppointmentStatus } from '../../services/appointmentService'
import { sendSMS, sendWhatsApp, sendCancelWhatsApp, buildBookingMessage, buildCancelMessage } from '../../services/notificationService'
import { getWorkingShifts, getDayName, formatDate, categorizeSlotsByShift } from '../../utils/bookingUtils'
import { APPOINTMENT_STATUS } from '../../utils/constants'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Card from '@mui/material/Card'
import InputAdornment from '@mui/material/InputAdornment'
import DialogActions from '@mui/material/DialogActions'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import PersonIcon from '@mui/icons-material/Person'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import ListAltIcon from '@mui/icons-material/ListAlt'
import CircularProgress from '@mui/material/CircularProgress'
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import toast from 'react-hot-toast'

const CallCenterBookToday = () => {
  const { facilityId } = useAuth()
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const today = new Date()
  const todayDate = formatDate(today)
  const todayDayName = getDayName(today)

  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedSpec, setSelectedSpec] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [patientData, setPatientData] = useState({ name: '', phone: '' })
  const [isBooking, setIsBooking] = useState(false)
  const [bookedCounts, setBookedCounts] = useState({})

  const [showPatientList, setShowPatientList] = useState(false)
  const [listDoctor, setListDoctor] = useState(null)
  const [listAppointments, setListAppointments] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [listTab, setListTab] = useState(0)
  const [cancelingId, setCancelingId] = useState(null)

  const loadData = async () => {
    if (!facilityId) { setLoading(false); return }
    setLoading(true)
    try {
      const allSpecs = await getSpecializations(facilityId)
      const activeSpecs = allSpecs.filter((s) => s.isActive !== false)
      const specData = await Promise.all(
        activeSpecs.map(async (spec) => {
          const doctors = await getDoctorsBySpec(facilityId, spec.id)
          const workingToday = doctors
            .filter((d) => d.isActive !== false && d.isBookingEnabled !== false)
            .filter((d) => getWorkingShifts(d, today) !== null)
          return { ...spec, doctors: workingToday }
        })
      )
      const specsWithDoctors = specData.filter((s) => s.doctors.length > 0)
      setSpecialties(specsWithDoctors)
      specsWithDoctors.forEach((spec) => spec.doctors.forEach((doc) => fetchDoctorCounts(doc)))
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء تحميل البيانات') }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [facilityId])

  const fetchDoctorCounts = async (doctor) => {
    if (bookedCounts[doctor.id]) return
    try {
      const slots = await getBookedSlots(facilityId, doctor.id, todayDate)
      const counts = categorizeSlotsByShift(slots, doctor.workingSchedule?.[todayDayName])
      setBookedCounts((prev) => ({ ...prev, [doctor.id]: counts }))
    } catch (err) { console.error(err) }
  }

  const handleOpenPatientList = async (doctor, spec) => {
    setListDoctor(doctor)
    setListAppointments([])
    setListTab(0)
    setShowPatientList(true)
    setLoadingList(true)
    try {
      const slots = await getBookedSlots(facilityId, doctor.id, todayDate)
      const active = slots
        .filter((s) => s.status !== APPOINTMENT_STATUS.CANCELED)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setListAppointments(active)
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء تحميل كشف الحجز') }
    setLoadingList(false)
  }

  const handleCancelAppointment = async (appt) => {
    setCancelingId(appt.id)
    try {
      await updateAppointmentStatus(facilityId, appt.id, APPOINTMENT_STATUS.CANCELED)
      setListAppointments((prev) => prev.filter((a) => a.id !== appt.id))
      toast.success('تم إلغاء الحجز')
      const phone = appt.patientPhone
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

  const handleConfirmBooking = async (e) => {
    e.preventDefault()
    if (!patientData.name.trim() || !patientData.phone.trim()) { toast.error('يرجى إدخال اسم المريض ورقم الهاتف'); return }
    setIsBooking(true)
    try {
      await createCallCenterAppointment(facilityId, {
        centralSpecialtyId: selectedSpec.id, specializationName: selectedSpec.specName,
        doctorId: selectedDoctor.id, doctorName: selectedDoctor.docName, facilityId,
        date: todayDate, period: selectedShift.type, time: selectedShift.start,
        patientName: patientData.name.trim(), patientPhone: patientData.phone.trim(),
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
      else toast.error(`فشل واتساب: ${waResult.error}${waResult.code ? ` (#${waResult.code})` : ''}`)

      const slots = await getBookedSlots(facilityId, selectedDoctor.id, todayDate)
      const counts = categorizeSlotsByShift(slots, selectedDoctor.workingSchedule?.[todayDayName])
      setBookedCounts((prev) => ({ ...prev, [selectedDoctor.id]: counts }))
      setShowFormModal(false); setPatientData({ name: '', phone: '' })
      setSelectedDoctor(null); setSelectedShift(null)
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
  }).filter(Boolean)

  if (loading) return <Spinner size="lg" />

  const cellSx = { py: 0.75, fontSize: '0.8rem' }
  const headSx = { py: 1, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: 2.5 }}>

      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip label="LIVE" color="error" size="small" icon={<FlashOnIcon />} sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }} />
          <Typography variant="h6" fontWeight={700}>حجز اليوم — {todayDate}</Typography>
        </Stack>
        <TextField
          size="small"
          placeholder="بحث..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>,
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon sx={{ fontSize: 15 }} /></IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ width: 200, '& .MuiInputBase-root': { fontSize: '0.82rem' } }}
        />
      </Stack>

      {specialties.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <MedicalServicesIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1.5 }} />
          <Typography variant="body2" color="text.secondary">لا يوجد أطباء مداومون اليوم</Typography>
        </Card>
      ) : filteredSpecialties.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body2" color="text.secondary">لا توجد نتائج تطابق "{searchTerm}"</Typography>
          <Button onClick={() => setSearchTerm('')} size="small" sx={{ mt: 1 }}>عرض الكل</Button>
        </Card>
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={headSx}>التخصص</TableCell>
                  <TableCell sx={headSx}>الطبيب</TableCell>
                  <TableCell sx={{ ...headSx, textAlign: 'center' }}>الكشف</TableCell>
                  <TableCell sx={{ ...headSx, textAlign: 'center' }}>
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                      <WbSunnyIcon sx={{ fontSize: 13, color: 'warning.main' }} />
                      <span>صباحاً</span>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ ...headSx, textAlign: 'center' }}>
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                      <NightsStayIcon sx={{ fontSize: 13, color: 'secondary.main' }} />
                      <span>مساءً</span>
                    </Stack>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSpecialties.flatMap((spec) =>
                  spec.doctors.map((doc) => {
                    const shifts = getWorkingShifts(doc, today) || []
                    const morningShift = shifts.find((s) => s.type === 'morning')
                    const eveningShift = shifts.find((s) => s.type === 'evening')
                    const counts = bookedCounts[doc.id] || { morning: 0, evening: 0 }
                    const hasCounts = !!bookedCounts[doc.id]

                    const ShiftCell = ({ shift }) => {
                      if (!shift) return (
                        <TableCell align="center" sx={cellSx}>
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>—</Typography>
                        </TableCell>
                      )
                      const limit = doc[shift.type + 'PatientLimit'] || 0
                      const booked = counts[shift.type] || 0
                      const isFull = limit > 0 && booked >= limit
                      return (
                        <TableCell align="center" sx={cellSx}>
                          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                            <Chip
                              size="small"
                              label={hasCounts ? `${booked}/${limit}` : '—'}
                              color={isFull ? 'error' : hasCounts ? 'success' : 'default'}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, minWidth: 44 }}
                            />
                            <Button
                              size="small"
                              variant={isFull ? 'outlined' : 'contained'}
                              color={isFull ? 'error' : 'primary'}
                              disabled={isFull}
                              disableElevation
                              onMouseEnter={() => fetchDoctorCounts(doc)}
                              onClick={() => { setSelectedDoctor(doc); setSelectedSpec(spec); setSelectedShift(shift); setShowFormModal(true) }}
                              sx={{ py: 0.2, px: 1.2, minWidth: 0, fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              {isFull ? 'مغلق' : 'حجز'}
                            </Button>
                          </Stack>
                        </TableCell>
                      )
                    }

                    return (
                      <TableRow key={doc.id} hover sx={{ '& td': { borderBottom: '1px solid', borderColor: 'grey.100' } }}>
                        <TableCell sx={cellSx}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                            {spec.specName}
                          </Typography>
                        </TableCell>
                        <TableCell sx={cellSx}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar src={doc.photoUrl} sx={{ width: 28, height: 28, bgcolor: 'primary.50' }}>
                              <PersonIcon sx={{ fontSize: 15 }} color="primary" />
                            </Avatar>
                            <Box>
                              <Typography fontWeight={700} sx={{ fontSize: '0.82rem', lineHeight: 1.2 }}>{doc.docName}</Typography>
                              {doc.phoneNumber && (
                                <Typography variant="caption" color="text.disabled" dir="ltr" sx={{ fontSize: '0.68rem' }}>{doc.phoneNumber}</Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="center" sx={cellSx}>
                          <Tooltip title="عرض كشف المرضى">
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => handleOpenPatientList(doc, spec)}
                              sx={{ width: 28, height: 28, border: '1px solid', borderColor: 'secondary.light', borderRadius: 1.2 }}
                            >
                              <ListAltIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <ShiftCell shift={morningShift} />
                        <ShiftCell shift={eveningShift} />
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Booking Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={`حجز — د. ${selectedDoctor?.docName}`} size="md">
        <Box sx={{ mb: 2.5, bgcolor: 'primary.50', borderRadius: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="primary.dark" fontWeight={700}>الموعد</Typography>
            <Typography fontWeight={700} sx={{ fontSize: '0.9rem' }}>{todayDate} · {selectedShift?.label}</Typography>
          </Box>
          <Typography variant="h5" fontWeight={700} color="primary" dir="ltr">{selectedShift?.start}</Typography>
        </Box>
        <Box component="form" onSubmit={handleConfirmBooking} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField autoFocus label="اسم المريض الكامل" required value={patientData.name} onChange={(e) => setPatientData({ ...patientData, name: e.target.value })} fullWidth size="small" placeholder="أدخل الاسم الرباعي" />
          <TextField label="رقم الهاتف" type="tel" required value={patientData.phone} onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })} fullWidth size="small" inputProps={{ dir: 'ltr' }} placeholder="09XXXXXXXX" />
          <DialogActions sx={{ px: 0, pb: 0 }}>
            <Button onClick={() => setShowFormModal(false)} variant="outlined" color="inherit" size="small">إلغاء</Button>
            <Button type="submit" variant="contained" color="success" disabled={isBooking}>
              {isBooking ? 'جاري الحفظ...' : 'تأكيد الحجز'}
            </Button>
          </DialogActions>
        </Box>
      </Modal>

      {/* Patient List Modal */}
      <Modal isOpen={showPatientList} onClose={() => setShowPatientList(false)} title={`كشف د. ${listDoctor?.docName} — ${todayDate}`} size="md">
        {loadingList ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : (
          <Box sx={{ mt: 0.5 }}>
            <Tabs value={listTab} onChange={(_, v) => setListTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5, minHeight: 34, '& .MuiTabs-indicator': { height: 2 } }}>
              <Tab icon={<WbSunnyIcon sx={{ fontSize: '0.85rem' }} />} iconPosition="start" label="صباحاً" sx={{ minHeight: 34, py: 0, fontSize: '0.8rem', fontWeight: 600 }} />
              <Tab icon={<NightsStayIcon sx={{ fontSize: '0.85rem' }} />} iconPosition="start" label="مساءً" sx={{ minHeight: 34, py: 0, fontSize: '0.8rem', fontWeight: 600 }} />
            </Tabs>
            {(() => {
              const currentType = listTab === 0 ? 'morning' : 'evening'
              const sectionAppts = listAppointments.filter((a) => a.period === currentType)
              if (sectionAppts.length === 0) return (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.disabled">لا يوجد حجوزات لهذه الفترة</Typography>
                </Box>
              )
              return (
                <Stack spacing={0.75}>
                  {sectionAppts.map((appt, idx) => (
                    <Box key={appt.id} sx={{ px: 1.5, py: 1, border: 1, borderColor: 'divider', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ minWidth: 18, textAlign: 'center' }}>{idx + 1}</Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>{appt.patientName}</Typography>
                        <Typography variant="caption" color="text.secondary" dir="ltr">{appt.patientPhone}</Typography>
                      </Box>
                      <Chip label={appt.time || appt.timeSlot} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                      <IconButton
                        size="small"
                        color="error"
                        disabled={cancelingId === appt.id}
                        onClick={() => handleCancelAppointment(appt)}
                        sx={{ width: 26, height: 26, border: '1px solid', borderColor: 'error.light', borderRadius: 1 }}
                      >
                        {cancelingId === appt.id ? <CircularProgress size={12} color="error" /> : <ClearIcon sx={{ fontSize: 14 }} />}
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )
            })()}
          </Box>
        )}
      </Modal>
    </Box>
  )
}

export default CallCenterBookToday

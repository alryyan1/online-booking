import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getSpecializations, getDoctorsBySpec } from '../../services/facilityService'
import { getBookedSlots, createCallCenterAppointment } from '../../services/appointmentService'
import { sendSMS, sendWhatsApp, buildBookingMessage } from '../../services/notificationService'
import { getAvailableBookingDays, categorizeSlotsByShift, formatDate } from '../../utils/bookingUtils'
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
import Grid from '@mui/material/Grid'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import EventIcon from '@mui/icons-material/Event'
import PersonIcon from '@mui/icons-material/Person'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import CircularProgress from '@mui/material/CircularProgress'
import toast from 'react-hot-toast'

const CallCenterBookNow = () => {
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

  const [showPatientList, setShowPatientList] = useState(false)
  const [listDoctor, setListDoctor] = useState(null)
  const [listDate, setListDate] = useState('')
  const [listAppointments, setListAppointments] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [listTab, setListTab] = useState(0)

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
    } catch (err) {
      console.error(err); toast.error('حدث خطأ أثناء تحميل البيانات')
    }
    setLoading(false)
  }

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

  const handleOpenPatientList = async (doctor) => {
    const activeDay = docSelectedDates[doctor.id]
    if (!activeDay) { toast.error('يرجى اختيار تاريخ أولاً'); return }
    
    setListDoctor(doctor)
    setListDate(activeDay.date)
    setListAppointments([])
    setListTab(0)
    setShowPatientList(true)
    setLoadingList(true)
    try {
      const slots = await getBookedSlots(facilityId, doctor.id, activeDay.date)
      // Exclude canceled appointments
      const activeSlots = slots.filter(s => s.status !== APPOINTMENT_STATUS.CANCELED)
      // Sort: Latest first (descending by createdAt)
      const sorted = activeSlots.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0
        const timeB = b.createdAt?.seconds || 0
        return timeB - timeA
      })
      setListAppointments(sorted)
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء تحميل كشف الحجز')
    }
    setLoadingList(false)
  }

  const handleDaySelect = (doctor, day) => {
    setDocSelectedDates((prev) => ({ ...prev, [doctor.id]: day }))
    fetchCounts(doctor, day)
  }

  const handleShiftSelect = (doctor, spec, day, shift) => {
    setSelectedDoctor(doctor); setSelectedSpec(spec); setSelectedDayRender(day); setSelectedShift(shift)
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

      // --- [ارسال التنبيهات] ---
      try {
        const message = buildBookingMessage({
          patientName: patientData.name.trim(),
          doctorName: selectedDoctor.docName,
          specialtyName: selectedSpec.specName,
          date: selectedDayRender.date,
          time: selectedShift.start,
          shift: selectedShift.label,
        })
        const phone = patientData.phone.trim()
        await Promise.all([
          sendSMS(phone, message),
          sendWhatsApp({ 
            phone, 
            patientName: patientData.name.trim(), 
            doctorName: selectedDoctor.docName, 
            date: selectedDayRender.date, 
            shift: selectedShift.label 
          }),
        ])
        console.log("Notifications triggered successfully")
      } catch (notifyErr) {
        console.error("Notification Error:", notifyErr)
      }

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
    const specMatches = spec.specName.toLowerCase().includes(term)
    const filteredDoctors = spec.doctors.filter((doc) => doc.docName.toLowerCase().includes(term))
    if (specMatches) return spec
    if (filteredDoctors.length > 0) return { ...spec, doctors: filteredDoctors }
    return null
  }).filter(Boolean)

  if (loading) return <Spinner size="lg" />

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', px: 3, py: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>حجز موعد جديد</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>اختر الطبيب المناسب للمريض بناءً على المواعيد المتاحة.</Typography>
        </Box>
        <TextField size="small" placeholder="ابحث باسم الطبيب أو التخصص..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            endAdornment: searchTerm ? <InputAdornment position="end"><Button size="small" onClick={() => setSearchTerm('')} sx={{ minWidth: 0, p: 0.5 }}><ClearIcon fontSize="small" /></Button></InputAdornment> : null,
          }}
          sx={{ width: { xs: '100%', md: 320 } }}
        />
      </Box>

      <Stack spacing={4}>
        {specialties.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 10 }}>
            <MedicalServicesIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
            <Typography color="text.secondary">لا يوجد أطباء متاحون للحجز حالياً</Typography>
          </Card>
        ) : filteredSpecialties.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 10 }}>
            <Typography color="text.secondary">لا توجد نتائج تطابق "{searchTerm}"</Typography>
            <Button onClick={() => setSearchTerm('')} size="small" sx={{ mt: 1 }}>عرض الكل</Button>
          </Card>
        ) : (
          filteredSpecialties.map((spec) => (
            <Box key={spec.id}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main', fontSize: '1rem', fontWeight: 700 }}>
                  {spec.specName.charAt(0)}
                </Avatar>
                <Typography variant="h6" fontWeight={700}>{spec.specName}</Typography>
                <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
                <Typography variant="caption" color="text.disabled">{spec.doctors.length} أطباء</Typography>
              </Stack>

              <Card>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>الطبيب</TableCell>
                        <TableCell align="center">التاريخ المختار</TableCell>
                        <TableCell align="center">صباحاً</TableCell>
                        <TableCell align="center">مساءً</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {spec.doctors.map((doc) => {
                        const activeDay = docSelectedDates[doc.id]
                        const countsKey = activeDay ? `${doc.id}_${activeDay.date}` : ''
                        const counts = bookedCounts[countsKey] || { morning: 0, evening: 0 }
                        const hasCounts = !!bookedCounts[countsKey]

                        const ShiftCell = ({ shiftType }) => {
                          const shift = activeDay?.shifts.find((s) => s.type === shiftType)
                          if (!shift) return <TableCell align="center"><Typography variant="caption" color="text.disabled">غير متاح</Typography></TableCell>
                          const limit = doc[shiftType + 'PatientLimit'] || 0
                          const booked = counts[shiftType] || 0
                          const isFull = limit > 0 && booked >= limit
                          return (
                            <TableCell align="center">
                              <Stack alignItems="center" spacing={0.75}>
                                <Typography variant="body2" fontWeight={700} dir="ltr">{shift.start}</Typography>
                                <Chip size="small" label={hasCounts ? `${booked}/${limit}` : '—/—'}
                                  color={isFull ? 'error' : hasCounts ? 'primary' : 'default'} variant="outlined" />
                                <Button size="small" variant="contained" color="secondary" disabled={isFull || (!hasCounts && loadingCounts)}
                                  onClick={() => handleShiftSelect(doc, spec, activeDay, shift)}>
                                  {isFull ? 'مغلق' : 'حجز'}
                                </Button>
                              </Stack>
                            </TableCell>
                          )
                        }

                        return (
                          <TableRow key={doc.id} hover>
                            <TableCell>
                              <Stack 
                                direction="row" 
                                spacing={1.5} 
                                alignItems="center"
                                onClick={() => handleOpenPatientList(doc)}
                                sx={{ cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                              >
                                <Avatar src={doc.photoUrl} sx={{ width: 40, height: 40, bgcolor: 'primary.100' }}>
                                  <PersonIcon fontSize="small" color="primary" />
                                </Avatar>
                                <Box>
                                  <Typography fontWeight={600}>{doc.docName}</Typography>
                                  <Typography variant="caption" color="text.secondary">{doc.phoneNumber || 'بدون رقم'}</Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell align="center">
                              <Button size="small" variant="outlined" startIcon={<EventIcon />}
                                onClick={() => { setDoctorForDatePick(doc); setShowDatePickerModal(true) }}>
                                {activeDay ? `${activeDay.dayName} ${activeDay.date.split('-').reverse().slice(0, 2).join('/')}` : 'اختر تاريخاً'}
                              </Button>
                            </TableCell>
                            <ShiftCell shiftType="morning" />
                            <ShiftCell shiftType="evening" />
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Box>
          ))
        )}
      </Stack>

      {/* Patient Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={`حجز موعد - ${selectedDoctor?.docName}`} size="md">
        <Box sx={{ mb: 3, bgcolor: 'primary.50', borderRadius: 2, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="primary.dark" fontWeight={700} sx={{ textTransform: 'uppercase' }}>الموعد المحدد</Typography>
            <Typography fontWeight={700}>{selectedDayRender?.dayName}، {selectedDayRender?.date}</Typography>
            <Typography variant="body2" color="primary">الفترة: {selectedShift?.label}</Typography>
          </Box>
          <Typography variant="h5" fontWeight={700} color="primary" dir="ltr">{selectedShift?.start}</Typography>
        </Box>
        <Box component="form" onSubmit={handleConfirmBooking} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="اسم المريض الكامل" required value={patientData.name} onChange={(e) => setPatientData({ ...patientData, name: e.target.value })} fullWidth placeholder="الاسم الرباعي" />
          <TextField label="رقم الهاتف" type="tel" required value={patientData.phone} onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })} fullWidth inputProps={{ dir: 'ltr' }} placeholder="09XXXXXXXX" />
          <DialogActions sx={{ px: 0, pb: 0 }}>
            <Button onClick={() => setShowFormModal(false)} variant="outlined" color="inherit">إلغاء</Button>
            <Button type="submit" variant="contained" color="success" size="large" disabled={isBooking}>
              {isBooking ? 'جاري الحفظ...' : 'تأكيد الحجز النهائي'}
            </Button>
          </DialogActions>
        </Box>
      </Modal>

      {/* Date Picker Modal */}
      <Modal isOpen={showDatePickerModal} onClose={() => setShowDatePickerModal(false)} title={`اختيار التاريخ - د. ${doctorForDatePick?.docName}`} size="md">
        <Grid container spacing={1.5} sx={{ pb: 1 }}>
          {doctorForDatePick?.availableDays.map((day) => {
            const isSelected = docSelectedDates[doctorForDatePick.id]?.date === day.date
            return (
              <Grid item xs={6} sm={3} key={day.date}>
                <Card variant={isSelected ? 'elevation' : 'outlined'}
                  sx={{ cursor: 'pointer', textAlign: 'center', p: 1.5, bgcolor: isSelected ? 'secondary.main' : 'background.paper', '&:hover': { bgcolor: isSelected ? 'secondary.dark' : 'grey.50' }, transition: 'all 0.15s' }}
                  onClick={() => { handleDaySelect(doctorForDatePick, day); setShowDatePickerModal(false) }}>
                  <Typography variant="caption" fontWeight={700} color={isSelected ? 'secondary.contrastText' : 'text.secondary'}>{day.dayName}</Typography>
                  <Typography variant="body2" fontWeight={700} color={isSelected ? 'secondary.contrastText' : 'text.primary'}>
                    {day.date.split('-').reverse().slice(0, 2).join('/')}
                  </Typography>
                  {isSelected && <Chip label="مختار" size="small" sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.25)', color: 'white', height: 18, fontSize: '0.6rem' }} />}
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Modal>

      {/* Patient List Modal */}
      <Modal 
        isOpen={showPatientList} 
        onClose={() => setShowPatientList(false)} 
        title={`كشف حجوزات د. ${listDoctor?.docName} - ${listDate}`} 
        size="md"
      >
        {loadingList ? (
          <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress size={30} /></Box>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Tabs 
              value={listTab} 
              onChange={(e, v) => setListTab(v)} 
              variant="fullWidth" 
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider', 
                mb: 2,
                minHeight: 38,
                '& .MuiTabs-indicator': { height: 2 }
              }}
            >
              <Tab 
                icon={<WbSunnyIcon sx={{ fontSize: '0.9rem' }} />} 
                iconPosition="start" 
                label="صباحاً" 
                sx={{ minHeight: 38, py: 0, fontSize: '0.85rem', fontWeight: 600 }}
              />
              <Tab 
                icon={<NightsStayIcon sx={{ fontSize: '0.9rem' }} />} 
                iconPosition="start" 
                label="مساءً" 
                sx={{ minHeight: 38, py: 0, fontSize: '0.85rem', fontWeight: 600 }}
              />
            </Tabs>

            {(() => {
              const currentType = listTab === 0 ? 'morning' : 'evening'
              const sectionAppts = listAppointments.filter(a => a.period === currentType)
              
              if (sectionAppts.length === 0) {
                return (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.disabled">لا يوجد حجوزات لهذه الفترة</Typography>
                  </Box>
                )
              }

              return (
                <Stack spacing={1.5}>
                  {sectionAppts.map((appt, idx) => (
                    <Box key={appt.id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'grey.100', color: 'text.secondary', fontSize: '0.85rem', fontWeight: 700 }}>
                        {idx + 1}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>{appt.patientName}</Typography>
                        <Typography variant="caption" color="text.secondary" dir="ltr">{appt.patientPhone}</Typography>
                      </Box>
                      <Chip label={appt.time || appt.timeSlot} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
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

export default CallCenterBookNow

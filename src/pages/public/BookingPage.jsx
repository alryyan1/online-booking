import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Avatar from '@mui/material/Avatar'
import Stack from '@mui/material/Stack'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import MuiLink from '@mui/material/Link'
import Divider from '@mui/material/Divider'
import PersonIcon from '@mui/icons-material/Person'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { getCentralDoctorById } from '../../services/doctorService'
import { getFacilityById, getInsuranceCompanies } from '../../services/facilityService'
import { bookAppointment } from '../../services/appointmentService'
import { useAuth } from '../../contexts/AuthContext'
import TimeSlotPicker from '../../components/appointment/TimeSlotPicker'
import Spinner from '../../components/common/Spinner'
import { getMinDate, formatDateArabic } from '../../utils/dateHelpers'
import toast from 'react-hot-toast'

const STEPS = ['اختر التاريخ', 'اختر الوقت', 'بيانات الحجز', 'تأكيد']

const BookingPage = () => {
  const { facilityId, doctorId } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [doctor, setDoctor] = useState(null)
  const [facility, setFacility] = useState(null)
  const [insurance, setInsurance] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [step, setStep] = useState(0)
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [selectedInsurance, setSelectedInsurance] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    Promise.all([getCentralDoctorById(doctorId), getFacilityById(facilityId), getInsuranceCompanies(facilityId)])
      .then(([d, f, ins]) => { setDoctor(d); setFacility(f); setInsurance(ins) })
      .finally(() => setLoading(false))
  }, [facilityId, doctorId])

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await bookAppointment(facilityId, {
        doctorId, doctorName: doctor.name, facilityId, facilityName: facility.name,
        patientId: currentUser.uid, patientEmail: currentUser.email,
        date, timeSlot, insurance: selectedInsurance, notes,
      })
      toast.success('تم حجز الموعد بنجاح!')
      navigate('/my-appointments')
    } catch (err) {
      if (err.message === 'SLOT_TAKEN') {
        toast.error('عذراً، هذا الموعد محجوز. يرجى اختيار وقت آخر.')
        setStep(1); setTimeSlot('')
      } else {
        toast.error('حدث خطأ أثناء الحجز، يرجى المحاولة مرة أخرى')
      }
    } finally { setSubmitting(false) }
  }

  if (loading) return <Spinner size="lg" />

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', px: 3, py: 5 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" underline="hover" color="inherit">الرئيسية</MuiLink>
        <MuiLink component={Link} to={`/facility/${facilityId}`} underline="hover" color="inherit">{facility?.name}</MuiLink>
        <Typography color="text.primary">حجز موعد</Typography>
      </Breadcrumbs>

      {/* Doctor info */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Avatar src={doctor?.imageUrl} sx={{ width: 64, height: 64, bgcolor: 'primary.100', flexShrink: 0 }}>
            <PersonIcon fontSize="large" color="primary" />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>{doctor?.name}</Typography>
            {doctor?.specialization && <Typography variant="body2" color="primary">{doctor.specialization}</Typography>}
            <Typography variant="body2" color="text.secondary">{facility?.name}</Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Stepper */}
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent sx={{ p: 3 }}>
          {/* Step 0: Date */}
          {step === 0 && (
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>اختر التاريخ</Typography>
              <TextField type="date" fullWidth value={date} onChange={(e) => setDate(e.target.value)} inputProps={{ min: getMinDate(), dir: 'ltr' }} />
              <Button variant="contained" fullWidth size="large" sx={{ mt: 2 }} onClick={() => { if (date) setStep(1); else toast.error('يرجى اختيار التاريخ') }}>
                التالي
              </Button>
            </Box>
          )}

          {/* Step 1: Time Slot */}
          {step === 1 && (
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>اختر الوقت</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{formatDateArabic(date)}</Typography>
              <TimeSlotPicker facilityId={facilityId} doctorId={doctorId} date={date} selected={timeSlot} onSelect={setTimeSlot} />
              <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                <Button variant="outlined" color="inherit" fullWidth onClick={() => setStep(0)}>السابق</Button>
                <Button variant="contained" fullWidth onClick={() => { if (timeSlot) setStep(2); else toast.error('يرجى اختيار وقت المراجعة') }}>التالي</Button>
              </Stack>
            </Box>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>بيانات الحجز</Typography>
              {insurance.length > 0 && (
                <TextField select label="شركة التأمين (اختياري)" value={selectedInsurance} onChange={(e) => setSelectedInsurance(e.target.value)} fullWidth sx={{ mb: 2 }}>
                  <MenuItem value="">بدون تأمين</MenuItem>
                  {insurance.map((ins) => <MenuItem key={ins.id} value={ins.name}>{ins.name}</MenuItem>)}
                </TextField>
              )}
              <TextField label="ملاحظات (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={3}
                placeholder="أي معلومات إضافية تريد إخبار الطبيب بها..." sx={{ mb: 2 }} />
              <Stack direction="row" spacing={1.5}>
                <Button variant="outlined" color="inherit" fullWidth onClick={() => setStep(1)}>السابق</Button>
                <Button variant="contained" fullWidth onClick={() => setStep(3)}>التالي</Button>
              </Stack>
            </Box>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>تأكيد الحجز</Typography>
              <Box sx={{ bgcolor: 'primary.50', borderRadius: 2, p: 2.5, mb: 3 }}>
                {[
                  { label: 'الطبيب', value: doctor?.name },
                  { label: 'التخصص', value: doctor?.specialization || '—' },
                  { label: 'التاريخ', value: formatDateArabic(date) },
                  { label: 'الوقت', value: timeSlot, dir: 'ltr' },
                  ...(selectedInsurance ? [{ label: 'التأمين', value: selectedInsurance }] : []),
                ].map((row, i) => (
                  <Box key={i}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                      <Typography variant="body2" fontWeight={600} dir={row.dir}>{row.value}</Typography>
                    </Box>
                    {i < 4 && <Divider />}
                  </Box>
                ))}
                {notes && (
                  <Box sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">ملاحظات: <Box component="span" color="text.primary">{notes}</Box></Typography>
                  </Box>
                )}
              </Box>
              <Stack direction="row" spacing={1.5}>
                <Button variant="outlined" color="inherit" fullWidth onClick={() => setStep(2)}>السابق</Button>
                <Button variant="contained" color="success" fullWidth size="large" onClick={handleConfirm} disabled={submitting}
                  startIcon={submitting ? null : <CheckCircleIcon />}>
                  {submitting ? 'جاري الحجز...' : 'تأكيد الحجز'}
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default BookingPage

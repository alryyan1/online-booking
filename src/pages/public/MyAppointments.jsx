import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFacilities } from '../../contexts/FacilityContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import EventIcon from '@mui/icons-material/Event'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ShieldIcon from '@mui/icons-material/Shield'
import { getPatientAppointments, updateAppointmentStatus } from '../../services/appointmentService'
import AppointmentStatusBadge from '../../components/appointment/AppointmentStatusBadge'
import Spinner from '../../components/common/Spinner'
import { formatDateArabic } from '../../utils/dateHelpers'
import { APPOINTMENT_STATUS } from '../../utils/constants'
import toast from 'react-hot-toast'

const MyAppointments = () => {
  const { currentUser } = useAuth()
  const { facilities } = useFacilities()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!currentUser || facilities.length === 0) return
    setLoading(true)
    const all = await Promise.all(facilities.map((f) => getPatientAppointments(f.id, currentUser.uid)))
    setAppointments(all.flat().sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
    setLoading(false)
  }

  useEffect(() => { load() }, [currentUser, facilities])

  const handleCancel = async (facilityId, appointmentId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء الموعد؟')) return
    try { await updateAppointmentStatus(facilityId, appointmentId, APPOINTMENT_STATUS.CANCELED); toast.success('تم إلغاء الموعد'); load() }
    catch { toast.error('حدث خطأ أثناء الإلغاء') }
  }

  if (loading) return <Spinner size="lg" />

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: 3, py: 5 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 4 }}>مواعيدي</Typography>

      {appointments.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 10 }}>
          <EventIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">لا توجد مواعيد محجوزة</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {appointments.map((appt) => (
            <Card key={appt.id} variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                      <Typography fontWeight={700} variant="h6">{appt.doctorName}</Typography>
                      <AppointmentStatusBadge status={appt.status} />
                    </Stack>
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <LocalHospitalIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary">{appt.facilityName}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <EventIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary">{formatDateArabic(appt.date)}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <AccessTimeIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary" dir="ltr">{appt.timeSlot}</Typography>
                      </Stack>
                      {appt.insurance && (
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <ShieldIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Typography variant="body2" color="text.secondary">{appt.insurance}</Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                  {appt.status === APPOINTMENT_STATUS.PENDING && (
                    <Button variant="outlined" color="error" size="small" onClick={() => handleCancel(appt.facilityId, appt.id)}>
                      إلغاء الموعد
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  )
}

export default MyAppointments

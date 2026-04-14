import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import PeopleIcon from '@mui/icons-material/People'
import EventIcon from '@mui/icons-material/Event'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import { getFacilityById } from '../../services/facilityService'
import { getCentralDoctors } from '../../services/doctorService'
import { getAppointments } from '../../services/appointmentService'
import { APPOINTMENT_STATUS } from '../../utils/constants'
import Spinner from '../../components/common/Spinner'

const FacilityAdminDashboard = () => {
  const { facilityId } = useAuth()
  const [facility, setFacility] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!facilityId) return
    Promise.all([getFacilityById(facilityId), getCentralDoctors(), getAppointments(facilityId)])
      .then(([f, d, a]) => { setFacility(f); setDoctors(d); setAppointments(a) })
      .finally(() => setLoading(false))
  }, [facilityId])

  if (loading) return <Spinner size="lg" />

  const pending = appointments.filter((a) => a.status === APPOINTMENT_STATUS.PENDING).length
  const confirmed = appointments.filter((a) => a.status === APPOINTMENT_STATUS.CONFIRMED).length
  const canceled = appointments.filter((a) => a.status === APPOINTMENT_STATUS.CANCELED).length

  const stats = [
    { label: 'إجمالي الأطباء', value: doctors.length, icon: <PeopleIcon fontSize="inherit" />, color: 'primary', link: '/admin/doctors' },
    { label: 'قيد الانتظار', value: pending, icon: <HourglassEmptyIcon fontSize="inherit" />, color: 'warning', link: '/admin/appointments' },
    { label: 'مواعيد مؤكدة', value: confirmed, icon: <CheckCircleIcon fontSize="inherit" />, color: 'success', link: '/admin/appointments' },
    { label: 'مواعيد ملغاة', value: canceled, icon: <CancelIcon fontSize="inherit" />, color: 'error', link: '/admin/appointments' },
  ]

  const quickActions = [
    { label: 'إدارة الأطباء', icon: <PeopleIcon sx={{ fontSize: 36 }} />, to: '/admin/doctors', color: 'primary' },
    { label: 'إدارة المواعيد', icon: <EventIcon sx={{ fontSize: 36 }} />, to: '/admin/appointments', color: 'success' },
    { label: 'معلومات المرفق', icon: <LocalHospitalIcon sx={{ fontSize: 36 }} />, to: '/admin/facility', color: 'secondary' },
  ]

  const recentAppointments = appointments.slice(0, 5)

  const apptStatusColor = (status) => ({ pending: 'warning', confirmed: 'success', canceled: 'error' }[status] || 'default')
  const apptStatusLabel = (status) => ({ pending: 'انتظار', confirmed: 'مؤكد', canceled: 'ملغي' }[status] || status)

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700}>لوحة التحكم — {facility?.name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{facility?.address}</Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats.map((s) => (
          <Grid item xs={6} lg={3} key={s.label}>
            <Card sx={{ bgcolor: `${s.color}.50`, border: 1, borderColor: `${s.color}.200`, boxShadow: 'none' }}>
              <CardActionArea component={Link} to={s.link} sx={{ p: 2.5 }}>
                <Box sx={{ color: `${s.color}.main`, fontSize: 32, mb: 1 }}>{s.icon}</Box>
                <Typography variant="h4" fontWeight={700} color={`${s.color}.main`}>{s.value}</Typography>
                <Typography variant="body2" fontWeight={500} color={`${s.color}.dark`} sx={{ mt: 0.5 }}>{s.label}</Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {quickActions.map((a) => (
          <Grid item xs={12} sm={4} key={a.label}>
            <Card sx={{ bgcolor: `${a.color}.main`, boxShadow: 2 }}>
              <CardActionArea component={Link} to={a.to} sx={{ p: 3, textAlign: 'center' }}>
                <Box sx={{ color: 'white', mb: 1 }}>{a.icon}</Box>
                <Typography fontWeight={600} color="white">{a.label}</Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Appointments */}
      <Card>
        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Typography fontWeight={700}>آخر المواعيد</Typography>
          <Button component={Link} to="/admin/appointments" size="small">عرض الكل</Button>
        </Box>
        {recentAppointments.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={5}>لا توجد مواعيد بعد</Typography>
        ) : (
          recentAppointments.map((appt, i) => (
            <Box key={appt.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, '&:hover': { bgcolor: 'grey.50' } }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{appt.doctorName}</Typography>
                  <Typography variant="caption" color="text.secondary">{appt.date} — {appt.timeSlot}</Typography>
                </Box>
                <Chip label={apptStatusLabel(appt.status)} size="small" color={apptStatusColor(appt.status)} variant="outlined" />
              </Box>
              {i < recentAppointments.length - 1 && <Divider />}
            </Box>
          ))
        )}
      </Card>
    </Box>
  )
}

export default FacilityAdminDashboard

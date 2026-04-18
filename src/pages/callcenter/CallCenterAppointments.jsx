import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getAppointments, updateAppointmentStatus, sendCancelWhatsApp } from '../../services/appointmentService'
import { formatDate } from '../../utils/bookingUtils'
import { APPOINTMENT_STATUS, APPOINTMENT_STATUS_LABELS } from '../../utils/constants'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import PersonIcon from '@mui/icons-material/Person'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import EventIcon from '@mui/icons-material/Event'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import CancelIcon from '@mui/icons-material/Cancel'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const CallCenterAppointments = () => {
  const { facilityId } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')
  const [patientSearch, setPatientSearch] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('all')

  const todayStr = formatDate(new Date())

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    getAppointments(facilityId)
      .then(setAppointments)
      .catch((err) => { console.error(err); toast.error('حدث خطأ أثناء تحميل المواعيد') })
      .finally(() => setLoading(false))
  }, [facilityId])

  const handleCancel = async (id) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) return
    const aptData = appointments.find(a => a.id === id)
    setLoading(true)
    try {
      await updateAppointmentStatus(facilityId, id, APPOINTMENT_STATUS.CANCELED)
      toast.success('تم إلغاء الحجز بنجاح')
      
      // WhatsApp notification
      if (aptData) {
        sendCancelWhatsApp(aptData)
      }

      // Re-fetch appointments from server to ensure UI is in sync
      const updated = await getAppointments(facilityId)
      setAppointments(updated)
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء إلغاء الحجز')
    } finally {
      setLoading(false)
    }
  }

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
    <Box sx={{ maxWidth: 1300, mx: 'auto', px: 3, py: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700}>إدارة المواعيد</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>تتبع وعرض وتحليل المواعيد المسجلة.</Typography>
      </Box>

      {/* Filter Toolbar */}
      <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }} justifyContent="space-between">
            <Stack direction="row" spacing={0.5} sx={{ bgcolor: 'grey.100', p: 0.5, borderRadius: 2, width: { xs: '100%', lg: 'auto' } }}>
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

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flex={1} justifyContent="flex-end" flexWrap="wrap">
              <TextField size="small" placeholder="اسم المريض أو الهاتف..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment> }} sx={{ minWidth: 180 }} />
              <TextField size="small" placeholder="الطبيب أو التخصص..." value={doctorSearch} onChange={(e) => setDoctorSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><MedicalServicesIcon fontSize="small" /></InputAdornment> }} sx={{ minWidth: 180 }} />
              <ToggleButtonGroup size="small" value={periodFilter} exclusive onChange={(_, v) => v && setPeriodFilter(v)}>
                <ToggleButton value="all">الكل</ToggleButton>
                <ToggleButton value="morning"><WbSunnyIcon fontSize="small" sx={{ mr: 0.5 }} />صباحاً</ToggleButton>
                <ToggleButton value="evening"><NightsStayIcon fontSize="small" sx={{ mr: 0.5 }} />مساءً</ToggleButton>
              </ToggleButtonGroup>
              <TextField type="date" size="small" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); if (e.target.value) setActiveTab('all') }} sx={{ width: 160 }} inputProps={{ dir: 'ltr' }} />
              {hasFilters && <IconButton size="small" color="error" onClick={clearFilters}><ClearIcon /></IconButton>}
            </Stack>
          </Stack>

          {hasFilters && (
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                نتائج البحث: <Box component="span" color="primary.main" fontWeight={700}>{counts.filtered}</Box> موعد
              </Typography>
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
                  <TableCell>المريض / الهاتف</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>الطبيب / التخصص</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>التاريخ</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>الوقت</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
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
                      <Chip size="small" label={apt.date || '—'} color={apt.date === todayStr ? 'error' : 'default'} variant={apt.date === todayStr ? 'filled' : 'outlined'} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Chip size="small" icon={apt.period === 'morning' ? <WbSunnyIcon /> : <NightsStayIcon />}
                        label={apt.period === 'morning' ? 'صباحاً' : apt.period === 'evening' ? 'مساءً' : '—'}
                        color={apt.period === 'morning' ? 'warning' : 'secondary'} variant="outlined" />
                      <Typography variant="caption" display="block" dir="ltr">{apt.time || apt.timeSlot || ''}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {apt.status === APPOINTMENT_STATUS.CANCELED ? (
                        <Typography variant="body2" color="error" fontWeight={800}>
                          تم الغاء الحجز
                        </Typography>
                      ) : (
                        <Button 
                          size="small" 
                          color="error" 
                          variant="outlined"
                          onClick={() => handleCancel(apt.id)}
                          sx={{ borderRadius: 2, fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          إلغاء الحجز
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  )
}

export default CallCenterAppointments

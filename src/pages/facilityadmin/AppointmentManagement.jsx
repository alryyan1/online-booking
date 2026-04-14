import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useAppointments } from '../../hooks/useAppointments'
import { updateAppointmentStatus, deleteAppointment } from '../../services/appointmentService'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import DeleteIcon from '@mui/icons-material/Delete'
import EventIcon from '@mui/icons-material/Event'
import AppointmentStatusBadge from '../../components/appointment/AppointmentStatusBadge'
import Spinner from '../../components/common/Spinner'
import { APPOINTMENT_STATUS } from '../../utils/constants'
import { formatDateArabic } from '../../utils/dateHelpers'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'انتظار' },
  { key: 'confirmed', label: 'مؤكد' },
  { key: 'canceled', label: 'ملغي' },
]

const AppointmentManagement = () => {
  const { facilityId } = useAuth()
  const { appointments, loading, refetch } = useAppointments(facilityId)
  const [activeTab, setActiveTab] = useState('all')

  const filtered = activeTab === 'all' ? appointments : appointments.filter((a) => a.status === activeTab)

  const handleStatus = async (appt, status) => {
    try {
      await updateAppointmentStatus(facilityId, appt.id, status)
      toast.success(status === APPOINTMENT_STATUS.CONFIRMED ? 'تم تأكيد الموعد' : 'تم إلغاء الموعد')
      refetch()
    } catch { toast.error('حدث خطأ') }
  }

  const handleDelete = async (appt) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموعد؟')) return
    try { await deleteAppointment(facilityId, appt.id); toast.success('تم حذف الموعد'); refetch() }
    catch { toast.error('حدث خطأ') }
  }

  const counts = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    canceled: appointments.filter((a) => a.status === 'canceled').length,
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700}>إدارة المواعيد</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{appointments.length} موعد إجمالي</Typography>
      </Box>

      {/* Tabs */}
      <Stack direction="row" spacing={1} sx={{ mb: 3, overflowX: 'auto', pb: 0.5 }}>
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setActiveTab(tab.key)}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            endIcon={
              <Chip
                label={counts[tab.key]}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'grey.100',
                  color: activeTab === tab.key ? 'white' : 'text.secondary',
                }}
              />
            }
          >
            {tab.label}
          </Button>
        ))}
      </Stack>

      {loading ? <Spinner size="lg" /> : filtered.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 10 }}>
          <EventIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">لا توجد مواعيد في هذا القسم</Typography>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الطبيب</TableCell>
                  <TableCell>التاريخ والوقت</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>التأمين</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((appt) => (
                  <TableRow key={appt.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{appt.doctorName}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 150, display: 'block' }}>{appt.patientEmail}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDateArabic(appt.date)}</Typography>
                      <Typography variant="caption" color="text.secondary" dir="ltr">{appt.timeSlot}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">{appt.insurance || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <AppointmentStatusBadge status={appt.status} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {appt.status === APPOINTMENT_STATUS.PENDING && (
                          <>
                            <Button size="small" color="success" variant="outlined" onClick={() => handleStatus(appt, APPOINTMENT_STATUS.CONFIRMED)}>تأكيد</Button>
                            <Button size="small" color="error" variant="outlined" onClick={() => handleStatus(appt, APPOINTMENT_STATUS.CANCELED)}>إلغاء</Button>
                          </>
                        )}
                        <IconButton size="small" color="default" onClick={() => handleDelete(appt)} title="حذف">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
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

export default AppointmentManagement

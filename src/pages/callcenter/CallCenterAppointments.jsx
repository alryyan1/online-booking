import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getAppointmentsPaginated, updateAppointmentStatus, sendCancelWhatsApp } from '../../services/appointmentService'
import { formatDate } from '../../utils/bookingUtils'
import { APPOINTMENT_STATUS } from '../../utils/constants'
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
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import PersonIcon from '@mui/icons-material/Person'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import EventIcon from '@mui/icons-material/Event'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import BlockIcon from '@mui/icons-material/Block'
import ClearIcon from '@mui/icons-material/Clear'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })

const timeAgo = (date) => {
  const secs = Math.round((date - Date.now()) / 1000)
  const abs = Math.abs(secs)
  if (abs < 60)   return rtf.format(Math.round(secs), 'second')
  if (abs < 3600) return rtf.format(Math.round(secs / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), 'hour')
  return rtf.format(Math.round(secs / 86400), 'day')
}

const PeriodChip = ({ period }) => {
  if (period === 'morning')
    return <Chip size="small" icon={<WbSunnyIcon sx={{ fontSize: '0.85rem !important' }} />} label="صباحاً" color="warning" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
  if (period === 'evening')
    return <Chip size="small" icon={<NightsStayIcon sx={{ fontSize: '0.85rem !important' }} />} label="مساءً" color="secondary" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
  return <Typography variant="caption" color="text.disabled">—</Typography>
}

const CallCenterAppointments = () => {
  const { facilityId } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastDoc, setLastDoc] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [cancelingId, setCancelingId] = useState(null)
  const [activeTab, setActiveTab] = useState('today')
  const [patientSearch, setPatientSearch] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('all')

  const todayStr = formatDate(new Date())

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    setLoading(true)
    getAppointmentsPaginated(facilityId)
      .then(({ appointments: data, lastDoc: cursor, hasMore: more }) => {
        setAppointments(data)
        setLastDoc(cursor)
        setHasMore(more)
      })
      .catch((err) => { console.error(err); toast.error('حدث خطأ أثناء تحميل المواعيد') })
      .finally(() => setLoading(false))
  }, [facilityId])

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    try {
      const { appointments: more, lastDoc: cursor, hasMore: stillMore } = await getAppointmentsPaginated(facilityId, lastDoc)
      setAppointments((prev) => [...prev, ...more])
      setLastDoc(cursor)
      setHasMore(stillMore)
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء تحميل المزيد')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) return
    const aptData = appointments.find((a) => a.id === id)
    setCancelingId(id)
    try {
      await updateAppointmentStatus(facilityId, id, APPOINTMENT_STATUS.CANCELED)
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: APPOINTMENT_STATUS.CANCELED } : a))
      toast.success('تم إلغاء الحجز')
      if (aptData) sendCancelWhatsApp(aptData)
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء إلغاء الحجز')
    } finally {
      setCancelingId(null)
    }
  }

  const filtered = appointments.filter((apt) => {
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

  const todayCount = appointments.filter((a) => a.date === todayStr).length
  const hasFilters = patientSearch || doctorSearch || dateFilter || periodFilter !== 'all'
  const clearFilters = () => { setPatientSearch(''); setDoctorSearch(''); setDateFilter(''); setPeriodFilter('all') }

  if (loading) return <Spinner size="lg" />

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>

      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>إدارة المواعيد</Typography>
          <Typography variant="caption" color="text.secondary">تتبع وإدارة المواعيد المسجلة</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip size="small" label={`اليوم: ${todayCount}`} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
          <Chip size="small" label={`الإجمالي: ${appointments.length}`} variant="outlined" sx={{ fontWeight: 600 }} />
        </Stack>
      </Stack>

      {/* Filter bar */}
      <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems={{ md: 'center' }}
          flexWrap="wrap"
          sx={{ p: 1.5 }}
        >
          {/* Today / All toggle */}
          <Stack direction="row" spacing={0.5} sx={{ bgcolor: 'grey.100', p: 0.4, borderRadius: 1.5, flexShrink: 0 }}>
            {[
              { key: 'today', label: 'اليوم' },
              { key: 'all', label: 'الكل' },
            ].map((t) => (
              <Button
                key={t.key}
                size="small"
                variant={activeTab === t.key ? 'contained' : 'text'}
                disableElevation
                onClick={() => { setActiveTab(t.key); if (t.key === 'today') setDateFilter('') }}
                sx={{ px: 2, py: 0.4, minWidth: 64, borderRadius: 1.2, fontSize: '0.78rem', color: activeTab === t.key ? undefined : 'text.secondary' }}
              >
                {t.label}
              </Button>
            ))}
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'flex' } }} />

          <TextField
            size="small"
            placeholder="المريض أو الهاتف..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ fontSize: 15, color: 'text.disabled' }} /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 150, '& .MuiInputBase-root': { fontSize: '0.82rem' } }}
          />
          <TextField
            size="small"
            placeholder="الطبيب أو التخصص..."
            value={doctorSearch}
            onChange={(e) => setDoctorSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><MedicalServicesIcon sx={{ fontSize: 15, color: 'text.disabled' }} /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 150, '& .MuiInputBase-root': { fontSize: '0.82rem' } }}
          />

          {/* Period filter */}
          <Stack direction="row" spacing={0.5} sx={{ bgcolor: 'grey.100', p: 0.4, borderRadius: 1.5, flexShrink: 0 }}>
            {[
              { key: 'all', label: 'الكل', color: 'primary' },
              { key: 'morning', label: 'ص', icon: <WbSunnyIcon sx={{ fontSize: 13 }} />, color: 'warning' },
              { key: 'evening', label: 'م', icon: <NightsStayIcon sx={{ fontSize: 13 }} />, color: 'secondary' },
            ].map((p) => (
              <Button
                key={p.key}
                size="small"
                variant={periodFilter === p.key ? 'contained' : 'text'}
                disableElevation
                startIcon={p.icon}
                color={p.color}
                onClick={() => setPeriodFilter(p.key)}
                sx={{ px: 1.5, py: 0.4, minWidth: 0, borderRadius: 1.2, fontSize: '0.75rem', color: periodFilter === p.key ? undefined : 'text.secondary' }}
              >
                {p.label}
              </Button>
            ))}
          </Stack>

          <TextField
            type="date"
            size="small"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); if (e.target.value) setActiveTab('all') }}
            sx={{ width: 145, '& .MuiInputBase-root': { fontSize: '0.82rem' } }}
            inputProps={{ dir: 'ltr' }}
          />

          {hasFilters && (
            <Tooltip title="مسح الفلاتر">
              <IconButton size="small" color="error" onClick={clearFilters}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        {hasFilters && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Typography variant="caption" color="text.secondary">{filtered.length} نتيجة</Typography>
          </Box>
        )}
      </Card>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <EventIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1.5 }} />
          <Typography variant="body2" color="text.secondary">لا توجد مواعيد تطابق بحثك</Typography>
          {hasFilters && <Button onClick={clearFilters} size="small" sx={{ mt: 1 }}>عرض الكل</Button>}
        </Card>
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ py: 1.2, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', width: 36 }}>#</TableCell>
                  <TableCell sx={{ py: 1.2, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>المريض</TableCell>
                  <TableCell sx={{ py: 1.2, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>الطبيب / التخصص</TableCell>
                  <TableCell sx={{ py: 1.2, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>التاريخ</TableCell>
                  <TableCell sx={{ py: 1.2, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>الفترة</TableCell>
                  <TableCell sx={{ py: 1.2, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', display: { xs: 'none', lg: 'table-cell' } }}>وقت التسجيل</TableCell>
                  <TableCell sx={{ py: 1.2, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }} align="center">الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((apt, idx) => {
                  const isCanceled = apt.status === APPOINTMENT_STATUS.CANCELED
                  const isToday = apt.date === todayStr
                  return (
                    <TableRow
                      key={apt.id}
                      hover
                      sx={{ opacity: isCanceled ? 0.5 : 1, '& td': { py: 0.8, borderBottom: '1px solid', borderColor: 'grey.100' } }}
                    >
                      <TableCell>
                        <Typography variant="caption" color="text.disabled" fontWeight={600}>{idx + 1}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={800} noWrap sx={{ fontSize: '0.95rem' }}>{apt.patientName || '—'}</Typography>
                        <Typography variant="caption" color="primary.main" dir="ltr" display="block" sx={{ fontSize: '0.72rem' }}>{apt.patientPhone || ''}</Typography>
                      </TableCell>

                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.82rem' }}>{apt.doctorName || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.72rem' }}>{apt.specializationName || ''}</Typography>
                      </TableCell>

                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Chip
                          size="small"
                          label={apt.date || '—'}
                          color={isToday ? 'primary' : 'default'}
                          variant={isToday ? 'filled' : 'outlined'}
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                        />
                      </TableCell>

                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Stack spacing={0.3}>
                          <PeriodChip period={apt.period} />
                          {(apt.time || apt.timeSlot) && (
                            <Typography variant="caption" color="text.secondary" dir="ltr" sx={{ fontSize: '0.68rem' }}>
                              {apt.time || apt.timeSlot}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        {apt.createdAt ? (() => {
                          const d = apt.createdAt.toDate ? apt.createdAt.toDate() : new Date(apt.createdAt)
                          return (
                            <Stack spacing={0}>
                              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.72rem' }} dir="ltr">
                                {d.toLocaleDateString('ar-EG')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }} dir="ltr">
                                {d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                {timeAgo(d)}
                              </Typography>
                            </Stack>
                          )
                        })() : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </TableCell>

                      <TableCell align="center">
                        {isCanceled ? (
                          <Chip
                            size="small"
                            icon={<BlockIcon sx={{ fontSize: '0.75rem !important' }} />}
                            label="ملغي"
                            color="error"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                          />
                        ) : (
                          <Tooltip title="إلغاء الحجز">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleCancel(apt.id)}
                              disabled={cancelingId === apt.id}
                              sx={{ width: 26, height: 26, border: '1px solid', borderColor: 'error.light', borderRadius: 1.2 }}
                            >
                              <BlockIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              {'محمّل: '}
              <Box component="span" fontWeight={700} color="text.primary">{appointments.length}</Box>
              {' موعد'}
            </Typography>
            {hasMore && (
              <Button size="small" variant="outlined" onClick={handleLoadMore} disabled={loadingMore} sx={{ fontSize: '0.75rem', py: 0.4 }}>
                {loadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
              </Button>
            )}
          </Box>
        </Card>
      )}
    </Box>
  )
}

export default CallCenterAppointments

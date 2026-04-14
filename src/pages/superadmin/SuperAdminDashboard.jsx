import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import PeopleIcon from '@mui/icons-material/People'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import VerifiedIcon from '@mui/icons-material/Verified'
import ShieldIcon from '@mui/icons-material/Shield'
import { getAllFacilities } from '../../services/facilityService'
import { getSpecialties } from '../../services/specialtyService'
import { getInsuranceCompanies } from '../../services/insuranceService'
import Spinner from '../../components/common/Spinner'

const StatCard = ({ label, value, icon, color, bgcolor }) => (
  <Card sx={{ bgcolor, borderRadius: 3, boxShadow: 'none', border: '1px solid', borderColor: `${color}.200` }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ color: `${color}.main`, fontSize: 36, mb: 1 }}>{icon}</Box>
      <Typography variant="h4" fontWeight={700} color={`${color}.main`}>{value}</Typography>
      <Typography variant="body2" fontWeight={500} color={`${color}.dark`} sx={{ mt: 0.5 }}>{label}</Typography>
    </CardContent>
  </Card>
)

const SuperAdminDashboard = () => {
  const [facilities, setFacilities] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [insurance, setInsurance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAllFacilities(), getSpecialties(), getInsuranceCompanies()])
      .then(([facs, specs, ins]) => { setFacilities(facs); setSpecialties(specs); setInsurance(ins) })
      .finally(() => setLoading(false))
  }, [])

  const available = facilities.filter((f) => f.available).length
  const unavailable = facilities.length - available
  const activeSpecs = specialties.filter((s) => s.active !== false).length
  const enabledInsurance = insurance.filter((c) => c.enabled !== false).length

  const stats = [
    { label: 'إجمالي المرافق', value: facilities.length, icon: <LocalHospitalIcon fontSize="inherit" />, color: 'primary', bgcolor: 'primary.50' },
    { label: 'مرافق نشطة', value: available, icon: <CheckCircleIcon fontSize="inherit" />, color: 'success', bgcolor: 'success.50' },
    { label: 'مرافق معطلة', value: unavailable, icon: <CancelIcon fontSize="inherit" />, color: 'error', bgcolor: 'error.50' },
    { label: 'إجمالي التخصصات', value: specialties.length, icon: <MedicalServicesIcon fontSize="inherit" />, color: 'secondary', bgcolor: 'secondary.50' },
    { label: 'تخصصات نشطة', value: activeSpecs, icon: <VerifiedIcon fontSize="inherit" />, color: 'info', bgcolor: 'info.50' },
    { label: 'شركات التأمين', value: insurance.length, icon: <ShieldIcon fontSize="inherit" />, color: 'warning', bgcolor: 'warning.50' },
    { label: 'تأمين مفعّل', value: enabledInsurance, icon: <ShieldIcon fontSize="inherit" />, color: 'success', bgcolor: 'success.50' },
  ]

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>لوحة تحكم المشرف العام</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>إدارة جميع المرافق الصحية</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button component={Link} to="/superadmin/insurance" variant="contained" color="secondary" size="small" startIcon={<ShieldIcon />}>التأمين</Button>
          <Button component={Link} to="/superadmin/specialties" variant="contained" color="secondary" size="small" startIcon={<MedicalServicesIcon />}>التخصصات</Button>
          <Button component={Link} to="/superadmin/doctors" variant="contained" color="success" size="small" startIcon={<MedicalServicesIcon />}>الأطباء</Button>
          <Button component={Link} to="/superadmin/users" variant="contained" color="info" size="small" startIcon={<PeopleIcon />}>المستخدمون</Button>
          <Button component={Link} to="/superadmin/facilities" variant="contained" size="small" startIcon={<LocalHospitalIcon />}>+ مرفق</Button>
        </Stack>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 5 }}>
        {stats.map((s) => (
          <Grid item xs={6} sm={4} lg={3} key={s.label}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* Facilities list */}
      <Card>
        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Typography fontWeight={700}>المرافق الصحية</Typography>
          <Button component={Link} to="/superadmin/facilities" size="small">إدارة الكل</Button>
        </Box>
        {loading ? (
          <Spinner size="md" />
        ) : facilities.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={5}>لا توجد مرافق بعد</Typography>
        ) : (
          facilities.map((f, i) => (
            <Box key={f.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, '&:hover': { bgcolor: 'grey.50' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={f.imageUrl} sx={{ bgcolor: 'primary.100', width: 44, height: 44 }}>
                    <LocalHospitalIcon color="primary" />
                  </Avatar>
                  <Box>
                    <Typography fontWeight={600}>{f.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{f.address}</Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={f.available ? 'نشط' : 'معطل'} size="small" color={f.available ? 'success' : 'error'} variant="outlined" />
                  <Button component={Link} to={`/superadmin/facilities/${f.id}`} variant="outlined" color="secondary" size="small">
                    لوحة التحكم
                  </Button>
                </Stack>
              </Box>
              {i < facilities.length - 1 && <Divider />}
            </Box>
          ))
        )}
      </Card>
    </Box>
  )
}

export default SuperAdminDashboard

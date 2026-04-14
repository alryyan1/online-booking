import { useFacilities } from '../../contexts/FacilityContext'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PeopleIcon from '@mui/icons-material/People'
import FacilityCard from '../../components/facility/FacilityCard'
import Spinner from '../../components/common/Spinner'

const Home = () => {
  const { facilities, loading } = useFacilities()

  return (
    <Box>
      {/* Hero */}
      <Box sx={{ background: 'linear-gradient(135deg, #1565c0 0%, #3949ab 100%)', color: 'white', py: { xs: 8, md: 12 }, px: 3, textAlign: 'center' }}>
        <Typography variant="h3" fontWeight={800} sx={{ mb: 2, fontSize: { xs: '2rem', md: '2.75rem' } }}>
          منظومة الحجز الطبي
        </Typography>
        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 520, mx: 'auto', mb: 4, fontWeight: 400, fontSize: { xs: '1rem', md: '1.15rem' } }}>
          احجز موعدك مع أفضل الأطباء في أقرب مرفق صحي إليك بكل سهولة وسرعة
        </Typography>
        <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" gap={1}>
          <Chip icon={<CheckCircleIcon />} label="حجز فوري" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', '.MuiChip-icon': { color: 'white' } }} variant="outlined" />
          <Chip icon={<PeopleIcon />} label="أطباء متخصصون" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', '.MuiChip-icon': { color: 'white' } }} variant="outlined" />
          <Chip icon={<LocalHospitalIcon />} label="مرافق متعددة" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', '.MuiChip-icon': { color: 'white' } }} variant="outlined" />
        </Stack>
      </Box>

      {/* Facilities */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: 3, py: 7 }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 5 }}>
          المرافق الصحية المتاحة
        </Typography>

        {loading ? (
          <Spinner size="lg" />
        ) : facilities.length === 0 ? (
          <Box textAlign="center" py={10}>
            <LocalHospitalIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">لا توجد مرافق صحية متاحة حالياً</Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {facilities.map((facility) => (
              <Grid item xs={12} sm={6} lg={4} key={facility.id}>
                <FacilityCard facility={facility} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  )
}

export default Home

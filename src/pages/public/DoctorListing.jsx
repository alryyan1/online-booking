import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import MuiLink from '@mui/material/Link'
import PersonIcon from '@mui/icons-material/Person'
import SearchIcon from '@mui/icons-material/Search'
import { getFacilityById } from '../../services/facilityService'
import { getCentralDoctors } from '../../services/doctorService'
import DoctorCard from '../../components/doctor/DoctorCard'
import Spinner from '../../components/common/Spinner'

const DoctorListing = () => {
  const { facilityId } = useParams()
  const [facility, setFacility] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getFacilityById(facilityId), getCentralDoctors()])
      .then(([f, d]) => { setFacility(f); setDoctors(d) })
      .finally(() => setLoading(false))
  }, [facilityId])

  const filtered = search.trim()
    ? doctors.filter((d) => d.name?.toLowerCase().includes(search.toLowerCase()) || d.specialization?.toLowerCase().includes(search.toLowerCase()))
    : doctors

  if (loading) return <Spinner size="lg" />

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', px: 3, py: 5 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" underline="hover" color="inherit">الرئيسية</MuiLink>
        <MuiLink component={Link} to={`/facility/${facilityId}`} underline="hover" color="inherit">{facility?.name}</MuiLink>
        <Typography color="text.primary">الأطباء</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Typography variant="h5" fontWeight={700}>أطباء {facility?.name}</Typography>
        <TextField size="small" placeholder="ابحث باسم الطبيب أو التخصص..." value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} sx={{ width: { xs: '100%', sm: 280 } }} />
      </Box>

      {filtered.length === 0 ? (
        <Box textAlign="center" py={10}>
          <PersonIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">لا يوجد أطباء متاحون</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filtered.map((doctor) => (
            <Grid item xs={12} sm={6} lg={4} key={doctor.id}>
              <DoctorCard doctor={doctor} facilityId={facilityId} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

export default DoctorListing

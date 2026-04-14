import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PhoneIcon from '@mui/icons-material/Phone'
import PersonIcon from '@mui/icons-material/Person'
import { getFacilityById } from '../../services/facilityService'
import { getCentralDoctors } from '../../services/doctorService'
import Spinner from '../../components/common/Spinner'

const FacilityDetail = () => {
  const { facilityId } = useParams()
  const [facility, setFacility] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getFacilityById(facilityId), getCentralDoctors()])
      .then(([f, d]) => { setFacility(f); setDoctors(d) })
      .finally(() => setLoading(false))
  }, [facilityId])

  if (loading) return <Spinner size="lg" />
  if (!facility) return (
    <Box textAlign="center" py={16}>
      <LocalHospitalIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
      <Typography color="text.secondary">المرفق غير موجود</Typography>
    </Box>
  )

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', px: 3, py: 5 }}>
      {/* Facility Header */}
      <Card sx={{ borderRadius: 3, overflow: 'hidden', mb: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="stretch">
          {/* Details — left */}
          <CardContent sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>{facility.name}</Typography>
            <Stack spacing={1}>
              {facility.address && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <LocationOnIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary">{facility.address}</Typography>
                </Stack>
              )}
              {facility.phone && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PhoneIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary" dir="ltr">{facility.phone}</Typography>
                </Stack>
              )}
            </Stack>
          </CardContent>
          {/* Image — right */}
          {facility.imageUrl ? (
            <Box
              component="img"
              src={facility.imageUrl}
              alt={facility.name}
              sx={{ width: { xs: '100%', sm: 240 }, height: { xs: 200, sm: 'auto' }, objectFit: 'cover', flexShrink: 0, order: { xs: -1, sm: 0 } }}
            />
          ) : (
            <Box sx={{ width: { xs: '100%', sm: 240 }, height: { xs: 160, sm: 'auto' }, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, order: { xs: -1, sm: 0 } }}>
              <LocalHospitalIcon sx={{ fontSize: 80, color: 'grey.300' }} />
            </Box>
          )}
        </Stack>
      </Card>

      {/* Doctors */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>الأطباء المتاحون ({doctors.length})</Typography>
        <Button component={Link} to={`/facility/${facilityId}/doctors`} size="small">عرض الكل ←</Button>
      </Box>

      {doctors.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">لا يوجد أطباء متاحون حالياً</Typography>
        </Card>
      ) : (
        <>
          <Grid container spacing={2}>
            {doctors.slice(0, 4).map((doctor) => (
              <Grid item xs={12} sm={6} key={doctor.id}>
                <Card variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={doctor.imageUrl} sx={{ width: 56, height: 56, bgcolor: 'primary.100', flexShrink: 0 }}>
                    <PersonIcon color="primary" />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700}>{doctor.name}</Typography>
                    {doctor.specialization && <Chip label={doctor.specialization} size="small" color="primary" variant="outlined" sx={{ mt: 0.25 }} />}
                  </Box>
                  <Button component={Link} to={`/facility/${facilityId}/book/${doctor.id}`} variant="contained" size="small" sx={{ flexShrink: 0 }}>
                    احجز
                  </Button>
                </Card>
              </Grid>
            ))}
          </Grid>

          {doctors.length > 4 && (
            <Box textAlign="center" sx={{ mt: 3 }}>
              <Button component={Link} to={`/facility/${facilityId}/doctors`} variant="outlined" size="large">
                عرض جميع الأطباء ({doctors.length})
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

export default FacilityDetail

import { Link } from 'react-router-dom'
import Card from '@mui/material/Card'
import CardMedia from '@mui/material/CardMedia'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PhoneIcon from '@mui/icons-material/Phone'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'

const FacilityCard = ({ facility }) => {
  const { id, name, address, phone, imageUrl } = facility

  return (
    <Card sx={{ borderRadius: 3, overflow: 'hidden', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 6 } }}>
      {imageUrl ? (
        <CardMedia component="img" height={192} image={imageUrl} alt={name} sx={{ objectFit: 'cover' }} />
      ) : (
        <Box sx={{ height: 192, bgcolor: 'primary.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LocalHospitalIcon sx={{ fontSize: 72, color: 'primary.200' }} />
        </Box>
      )}
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>{name}</Typography>
        {address && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
            <LocationOnIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">{address}</Typography>
          </Stack>
        )}
        {phone && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <PhoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary" dir="ltr">{phone}</Typography>
          </Stack>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button component={Link} to={`/facility/${id}`} variant="contained" fullWidth>
          عرض التفاصيل
        </Button>
      </CardActions>
    </Card>
  )
}

export default FacilityCard

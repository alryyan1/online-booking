import { Link } from 'react-router-dom'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import PersonIcon from '@mui/icons-material/Person'
import EventIcon from '@mui/icons-material/Event'

const DoctorCard = ({ doctor, facilityId }) => {
  const { id, name, specialization, imageUrl, photoUrl, bio, workingDays } = doctor
  const displayImage = imageUrl || photoUrl

  return (
    <Card sx={{ borderRadius: 3, display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar src={displayImage} sx={{ width: 64, height: 64, bgcolor: 'primary.100', flexShrink: 0 }}>
            <PersonIcon fontSize="large" color="primary" />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>{name}</Typography>
            {specialization && <Chip label={specialization} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />}
          </Box>
        </Box>

        {bio && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{bio}</Typography>}

        {workingDays && workingDays.length > 0 && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <EventIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">{workingDays.join(' - ')}</Typography>
          </Stack>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button component={Link} to={`/facility/${facilityId}/book/${id}`} variant="contained" fullWidth>
          احجز موعداً
        </Button>
      </CardActions>
    </Card>
  )
}

export default DoctorCard

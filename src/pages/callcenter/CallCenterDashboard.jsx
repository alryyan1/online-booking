import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import EventIcon from '@mui/icons-material/Event'
import PeopleIcon from '@mui/icons-material/People'

const ACTIONS = [
  { label: 'حجز اليوم', desc: 'انتقل إلى صفحة حجز اليوم', icon: <FlashOnIcon sx={{ fontSize: 32 }} />, link: '/callcenter/book-today', color: 'error' },
  { label: 'حجز موعد جديد', desc: 'انتقل إلى صفحة حجز موعد جديد', icon: <AddCircleIcon sx={{ fontSize: 32 }} />, link: '/callcenter/book', color: 'primary' },
  { label: 'المواعيد', desc: 'انتقل إلى صفحة المواعيد', icon: <EventIcon sx={{ fontSize: 32 }} />, link: '/callcenter/appointments', color: 'success' },
  { label: 'جدول الأطباء', desc: 'انتقل إلى صفحة جدول الأطباء', icon: <PeopleIcon sx={{ fontSize: 32 }} />, link: '/callcenter/schedule', color: 'secondary' },
]

const CallCenterDashboard = () => {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 5 }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={700}>لوحة تحكم كول سنتر</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>مرحباً بك، يمكنك إدارة المواعيد والحجوزات من هنا.</Typography>
      </Box>

      <Grid container spacing={3}>
        {ACTIONS.map((action) => (
          <Grid item xs={12} sm={6} md={3} key={action.label}>
            <Card sx={{ borderRadius: 3, border: 1, borderColor: `${action.color}.100`, '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
              <CardActionArea component={Link} to={action.link} sx={{ p: 3 }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ width: 52, height: 52, bgcolor: `${action.color}.main`, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', mb: 2 }}>
                    {action.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700}>{action.label}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{action.desc}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default CallCenterDashboard

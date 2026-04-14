import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const Footer = () => (
  <Box component="footer" sx={{ bgcolor: 'grey.800', color: 'grey.300', textAlign: 'center', py: 3, mt: 'auto' }}>
    <Typography variant="body2">
      جميع الحقوق محفوظة &copy; {new Date().getFullYear()} — منظومة الحجز الطبي
    </Typography>
  </Box>
)

export default Footer

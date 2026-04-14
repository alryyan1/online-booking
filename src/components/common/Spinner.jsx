import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

const sizeMap = { sm: 20, md: 32, lg: 48 }

const Spinner = ({ size = 'md', className = '' }) => (
  <Box className={className} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
    <CircularProgress size={sizeMap[size] ?? 32} />
  </Box>
)

export default Spinner

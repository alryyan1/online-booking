import Chip from '@mui/material/Chip'
import { APPOINTMENT_STATUS_LABELS } from '../../utils/constants'

const colorMap = {
  pending: 'warning',
  confirmed: 'success',
  canceled: 'error',
}

const AppointmentStatusBadge = ({ status }) => (
  <Chip
    label={APPOINTMENT_STATUS_LABELS[status] || status}
    size="small"
    color={colorMap[status] || 'default'}
    variant="outlined"
  />
)

export default AppointmentStatusBadge

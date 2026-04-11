import { APPOINTMENT_STATUS_LABELS } from '../../utils/constants'

const colors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  canceled: 'bg-red-100 text-red-800',
}

const AppointmentStatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
    {APPOINTMENT_STATUS_LABELS[status] || status}
  </span>
)

export default AppointmentStatusBadge

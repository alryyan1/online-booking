import { useEffect, useState } from 'react'
import { getBookedSlots } from '../../services/appointmentService'
import { TIME_SLOTS } from '../../utils/constants'
import Spinner from '../common/Spinner'

const TimeSlotPicker = ({ facilityId, doctorId, date, selected, onSelect }) => {
  const [bookedSlots, setBookedSlots] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!facilityId || !doctorId || !date) return
    setLoading(true)
    getBookedSlots(facilityId, doctorId, date)
      .then(setBookedSlots)
      .finally(() => setLoading(false))
  }, [facilityId, doctorId, date])

  if (loading) return <Spinner size="sm" className="py-4" />

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
      {TIME_SLOTS.map((slot) => {
        const isBooked = bookedSlots.includes(slot)
        const isSelected = selected === slot
        return (
          <button
            key={slot}
            type="button"
            disabled={isBooked}
            onClick={() => !isBooked && onSelect(slot)}
            className={`py-2 px-1 rounded-lg text-sm font-medium border transition
              ${isBooked
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                : isSelected
                ? 'bg-blue-600 text-white border-blue-600 shadow'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
          >
            {slot}
          </button>
        )
      })}
    </div>
  )
}

export default TimeSlotPicker

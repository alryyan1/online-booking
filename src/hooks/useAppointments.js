import { useState, useEffect } from 'react'
import { getAppointments } from '../services/appointmentService'

export const useAppointments = (facilityId) => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = async () => {
    if (!facilityId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getAppointments(facilityId)
      setAppointments(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
  }, [facilityId])

  return { appointments, loading, error, refetch: fetch }
}

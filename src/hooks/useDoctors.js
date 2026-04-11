import { useState, useEffect } from 'react'
import { getCentralDoctors } from '../services/doctorService'

export const useDoctors = () => {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCentralDoctors()
      setDoctors(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
  }, [])

  return { doctors, loading, error, refetch: fetch }
}

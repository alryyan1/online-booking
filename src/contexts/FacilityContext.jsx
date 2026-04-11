import { createContext, useContext, useEffect, useState } from 'react'
import { getAvailableFacilities } from '../services/facilityService'

const FacilityContext = createContext(null)

export const FacilityProvider = ({ children }) => {
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFacilities = async () => {
    setLoading(true)
    try {
      const data = await getAvailableFacilities()
      setFacilities(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFacilities()
  }, [])

  return (
    <FacilityContext.Provider value={{ facilities, loading, refetch: fetchFacilities }}>
      {children}
    </FacilityContext.Provider>
  )
}

export const useFacilities = () => {
  const ctx = useContext(FacilityContext)
  if (!ctx) throw new Error('useFacilities must be used within FacilityProvider')
  return ctx
}

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'
import { loginWithEmail, registerUser, logout, getUserRole } from '../services/authService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [facilityId, setFacilityId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true)
      if (user) {
        setCurrentUser(user)
        const { role, facilityId: fid } = await getUserRole(user)
        setUserRole(role)
        setFacilityId(fid)
      } else {
        setCurrentUser(null)
        setUserRole(null)
        setFacilityId(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async (email, password) => {
    const res = await loginWithEmail(email, password)
    const { role, facilityId: fid } = await getUserRole(res.user)
    setUserRole(role)
    setFacilityId(fid)
    return { ...res, role, facilityId: fid }
  }

  const register = (email, password, displayName, role, facilityId) =>
    registerUser(email, password, displayName, role, facilityId)

  const logoutUser = async () => {
    await logout()
    setCurrentUser(null)
    setUserRole(null)
    setFacilityId(null)
  }

  return (
    <AuthContext.Provider
      value={{ currentUser, userRole, facilityId, loading, login, register, logout: logoutUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

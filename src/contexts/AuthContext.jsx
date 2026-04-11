import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'
import { loginWithEmail, registerPatient, logout, getUserRole } from '../services/authService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [facilityId, setFacilityId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        const { role, facilityId: fid } = await getUserRole(user)
        setUserRole(role)
        setFacilityId(fid)
      } else {
        setUserRole(null)
        setFacilityId(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = (email, password) => loginWithEmail(email, password)

  const register = (email, password, displayName) =>
    registerPatient(email, password, displayName)

  const logoutUser = () => logout()

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

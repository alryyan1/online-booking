import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'
import { loginWithEmail, registerPatient, logout, getUserRole } from '../services/authService'
import { ROLES } from '../utils/constants'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [facilityId, setFacilityId] = useState(null)
  const [loading, setLoading] = useState(true)

  const setupCustomUser = (userData, uid) => {
    setCurrentUser({ uid, ...userData, isCustom: true })
    const role = userData.role || (userData.userType === 'callCenter' ? ROLES.CALL_CENTER : ROLES.PATIENT)
    setUserRole(role)
    setFacilityId(userData.centerId || null)
    localStorage.setItem('customUser', JSON.stringify({ userData, uid }))
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        const { role, facilityId: fid } = await getUserRole(user)
        setUserRole(role)
        setFacilityId(fid)
        setLoading(false)
      } else {
        // No Firebase user, check for custom user in localStorage
        const stored = localStorage.getItem('customUser')
        if (stored) {
          const { userData, uid } = JSON.parse(stored)
          setupCustomUser(userData, uid)
        } else {
          setCurrentUser(null)
          setUserRole(null)
          setFacilityId(null)
        }
        setLoading(false)
      }
    })
    return unsubscribe
  }, [])

  const login = async (identifier, password) => {
    const res = await loginWithEmail(identifier, password)
    if (res.user?.isCustom) {
      setupCustomUser(res.userData, res.user.uid)
    }
    return res
  }

  const register = (email, password, displayName) =>
    registerPatient(email, password, displayName)

  const logoutUser = async () => {
    localStorage.removeItem('customUser')
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

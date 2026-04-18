import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ProtectedRoute from '../components/common/ProtectedRoute'
import { ROLES, getRedirectPath, getLandingPath } from '../utils/constants'


// Auth pages
import Login from '../pages/auth/Login'


// Super Admin pages
import SuperAdminDashboard from '../pages/superadmin/SuperAdminDashboard'
import FacilityManagement from '../pages/superadmin/FacilityManagement'
import CentralDoctors from '../pages/superadmin/CentralDoctors'
import MedicalSpecialties from '../pages/superadmin/MedicalSpecialties'
import InsuranceCompanies from '../pages/superadmin/InsuranceCompanies'
import AdminFacilityDetail from '../pages/superadmin/AdminFacilityDetail'
import SystemUsers from '../pages/superadmin/SystemUsers'


// Call Center pages
import CallCenterDashboard from '../pages/callcenter/CallCenterDashboard'
import CallCenterBookNow from '../pages/callcenter/CallCenterBookNow'
import CallCenterBookToday from '../pages/callcenter/CallCenterBookToday'
import CallCenterAppointments from '../pages/callcenter/CallCenterAppointments'
import CallCenterSchedule from '../pages/callcenter/CallCenterSchedule'

// Not Found
import NotFound from '../pages/NotFound'

const GuestRoute = ({ children }) => {
  const { currentUser, userRole, facilityId, loading } = useAuth()
  if (loading) return null
  if (currentUser) return <Navigate to={getLandingPath(userRole, facilityId)} replace />
  return children
}

const AppRouter = () => (
  <Routes>
    {/* Root → redirect to login */}
    <Route path="/" element={<Navigate to="/login" replace />} />

    {/* Auth */}
    <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />


    {/* Super Admin */}
    <Route path="/superadmin" element={<Navigate to="/superadmin/dashboard" replace />} />
    <Route
      path="/superadmin/dashboard"
      element={
        <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
          <SuperAdminDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/superadmin/facilities"
      element={
        <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
          <FacilityManagement />
        </ProtectedRoute>
      }
    />
    <Route
      path="/superadmin/doctors"
      element={
        <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
          <CentralDoctors />
        </ProtectedRoute>
      }
    />
    <Route
      path="/superadmin/specialties"
      element={
        <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
          <MedicalSpecialties />
        </ProtectedRoute>
      }
    />
    <Route
      path="/superadmin/insurance"
      element={
        <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
          <InsuranceCompanies />
        </ProtectedRoute>
      }
    />
    <Route
      path="/superadmin/users"
      element={
        <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
          <SystemUsers />
        </ProtectedRoute>
      }
    />
    <Route
      path="/superadmin/facilities/:facilityId"
      element={
        <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
          <AdminFacilityDetail />
        </ProtectedRoute>
      }
    />

    {/* Facility */}
    <Route
      path="/admin/facilities/:facilityId"
      element={
        <ProtectedRoute>
          <AdminFacilityDetail />
        </ProtectedRoute>
      }
    />

    {/* Call Center */}
    <Route path="/callcenter/dashboard" element={<ProtectedRoute><CallCenterDashboard /></ProtectedRoute>} />
    <Route path="/callcenter/book" element={<ProtectedRoute><CallCenterBookNow /></ProtectedRoute>} />
    <Route path="/callcenter/book-today" element={<ProtectedRoute><CallCenterBookToday /></ProtectedRoute>} />
    <Route path="/callcenter/appointments" element={<ProtectedRoute><CallCenterAppointments /></ProtectedRoute>} />
    <Route path="/callcenter/schedule" element={<ProtectedRoute><CallCenterSchedule /></ProtectedRoute>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
)

export default AppRouter

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ProtectedRoute from '../components/common/ProtectedRoute'
import { ROLES } from '../utils/constants'

// Public pages
import Home from '../pages/public/Home'
import FacilityDetail from '../pages/public/FacilityDetail'
import DoctorListing from '../pages/public/DoctorListing'
import BookingPage from '../pages/public/BookingPage'
import MyAppointments from '../pages/public/MyAppointments'

// Auth pages
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'

// Super Admin pages
import SuperAdminDashboard from '../pages/superadmin/SuperAdminDashboard'
import FacilityManagement from '../pages/superadmin/FacilityManagement'
import CentralDoctors from '../pages/superadmin/CentralDoctors'
import MedicalSpecialties from '../pages/superadmin/MedicalSpecialties'
import InsuranceCompanies from '../pages/superadmin/InsuranceCompanies'
import AdminFacilityDetail from '../pages/superadmin/AdminFacilityDetail'

// Facility Admin pages
import FacilityAdminDashboard from '../pages/facilityadmin/FacilityAdminDashboard'
import DoctorManagement from '../pages/facilityadmin/DoctorManagement'
import AppointmentManagement from '../pages/facilityadmin/AppointmentManagement'
import FacilityInfo from '../pages/facilityadmin/FacilityInfo'

// Not Found
import NotFound from '../pages/NotFound'

const GuestRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth()
  if (loading) return null
  if (currentUser) {
    if (userRole === ROLES.SUPER_ADMIN) return <Navigate to="/superadmin/dashboard" replace />
    if (userRole === ROLES.FACILITY_ADMIN) return <Navigate to="/admin/dashboard" replace />
    return <Navigate to="/" replace />
  }
  return children
}

const AppRouter = () => (
  <Routes>
    {/* Public */}
    <Route path="/" element={<Home />} />
    <Route path="/facility/:facilityId" element={<FacilityDetail />} />
    <Route path="/facility/:facilityId/doctors" element={<DoctorListing />} />
    <Route
      path="/facility/:facilityId/book/:doctorId"
      element={
        <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
          <BookingPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/my-appointments"
      element={
        <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
          <MyAppointments />
        </ProtectedRoute>
      }
    />

    {/* Auth */}
    <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
    <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

    {/* Super Admin */}
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
      path="/superadmin/facilities/:facilityId"
      element={
        <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
          <AdminFacilityDetail />
        </ProtectedRoute>
      }
    />

    {/* Facility Admin */}
    <Route
      path="/admin/dashboard"
      element={
        <ProtectedRoute allowedRoles={[ROLES.FACILITY_ADMIN]}>
          <FacilityAdminDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/doctors"
      element={
        <ProtectedRoute allowedRoles={[ROLES.FACILITY_ADMIN]}>
          <DoctorManagement />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/appointments"
      element={
        <ProtectedRoute allowedRoles={[ROLES.FACILITY_ADMIN]}>
          <AppointmentManagement />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/facility"
      element={
        <ProtectedRoute allowedRoles={[ROLES.FACILITY_ADMIN]}>
          <FacilityInfo />
        </ProtectedRoute>
      }
    />

    <Route path="*" element={<NotFound />} />
  </Routes>
)

export default AppRouter

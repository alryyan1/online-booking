import { createHashRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/common/ProtectedRoute'
import Navbar from '../components/common/Navbar'


// Auth
import Login from '../pages/auth/Login'

// Super Admin
import SuperAdminDashboard from '../pages/superadmin/SuperAdminDashboard'
import FacilityManagement from '../pages/superadmin/FacilityManagement'
import CentralDoctors from '../pages/superadmin/CentralDoctors'
import MedicalSpecialties from '../pages/superadmin/MedicalSpecialties'
import InsuranceCompanies from '../pages/superadmin/InsuranceCompanies'
import AdminFacilityDetail from '../pages/superadmin/AdminFacilityDetail'
import SystemUsers from '../pages/superadmin/SystemUsers'

// Call Center
import CallCenterDashboard from '../pages/callcenter/CallCenterDashboard'
import CallCenterBookNow from '../pages/callcenter/CallCenterBookNow'
import CallCenterBookToday from '../pages/callcenter/CallCenterBookToday'
import CallCenterAppointments from '../pages/callcenter/CallCenterAppointments'
import CallCenterSchedule from '../pages/callcenter/CallCenterSchedule'
import Statistics from '../pages/callcenter/Statistics'

// Not Found
import NotFound from '../pages/NotFound'

const GuestRoute = ({ children }) => {
  const { currentUser, loading } = useAuth()
  if (loading) return null
  if (currentUser) return <Navigate to="/callcenter/book-today" replace />
  return children
}

// Layout with Navbar
const AppLayout = () => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
  </div>
)

// Layout without Navbar (auth pages)
const AuthLayout = () => <Outlet />

const auth = (el) => <ProtectedRoute>{el}</ProtectedRoute>

const router = createHashRouter([
  {
    path: '/',
    children: [
      // ── Auth pages (no Navbar) ──────────────────────────────
      {
        element: <AuthLayout />,
        children: [
          { index: true, element: <Navigate to="/login" replace /> },
          { path: 'login', element: <GuestRoute><Login /></GuestRoute> },
        ],
      },

      // ── App pages (with Navbar) ─────────────────────────────
      {
        element: <AppLayout />,
        children: [
          // Super Admin
          { path: 'superadmin',                        element: auth(<SuperAdminDashboard />) },
          { path: 'superadmin/facilities',             element: auth(<FacilityManagement />) },
          { path: 'superadmin/facilities/:facilityId', element: auth(<AdminFacilityDetail />) },
          { path: 'superadmin/doctors',                element: auth(<CentralDoctors />) },
          { path: 'superadmin/specialties',            element: auth(<MedicalSpecialties />) },
          { path: 'superadmin/insurance',              element: auth(<InsuranceCompanies />) },
          { path: 'superadmin/users',                  element: auth(<SystemUsers />) },

          // Facility
          { path: 'admin/facilities/:facilityId',      element: auth(<AdminFacilityDetail />) },

          // Call Center
          { path: 'callcenter/dashboard',              element: auth(<CallCenterDashboard />) },
          { path: 'callcenter/book',                   element: auth(<CallCenterBookNow />) },
          { path: 'callcenter/book-today',             element: auth(<CallCenterBookToday />) },
          { path: 'callcenter/appointments',           element: auth(<CallCenterAppointments />) },
          { path: 'callcenter/schedule',               element: auth(<CallCenterSchedule />) },
          { path: 'callcenter/statistics',             element: auth(<Statistics />) },
        ],
      },

      // 404
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default router

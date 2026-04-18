export const ROLES = {
  SUPER_ADMIN: 'superadmin',
  FACILITY_ADMIN: 'facilityadmin',
  PATIENT: 'patient',
  CALL_CENTER: 'callcenter',
}

// All non-superadmin roles that belong to a facility
export const FACILITY_ROLES = ['admin', 'callcenter', 'reception', 'doctor', 'facilityadmin']

/**
 * Returns the post-login redirect path for a given role + facilityId.
 * superadmin → superadmin dashboard
 * any facility role with facilityId → their facility detail page
 * any facility role without facilityId → superadmin dashboard (fallback)
 */
export const getRedirectPath = (role, facilityId) => {
  if (role === ROLES.SUPER_ADMIN) return '/superadmin/dashboard'
  if (facilityId) return `/admin/facilities/${facilityId}`
  return '/superadmin/dashboard'
}

/**
 * Returns the initial landing page after login.
 * Facility users start at 'Book Today'.
 */
export const getLandingPath = (role, facilityId) => {
  if (role === ROLES.SUPER_ADMIN) return '/superadmin/dashboard'
  if (facilityId) return '/callcenter/book-today'
  return '/superadmin/dashboard'
}

export const SUPER_ADMIN_EMAILS = [
  import.meta.env.VITE_SUPER_ADMIN_EMAIL_1,
  import.meta.env.VITE_SUPER_ADMIN_EMAIL_2,
]

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELED: 'canceled',
}

export const APPOINTMENT_STATUS_LABELS = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  canceled: 'ملغي',
}

export const COLLECTIONS = {
  FACILITIES: 'medicalFacilities',
  DOCTORS: 'doctors',
  APPOINTMENTS: 'appointments',
  INSURANCE: 'insuranceCompanies',
  SPECIALIZATIONS: 'specializations',
  USERS: 'users',
  SLOTS: 'slots',
}

export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30',
]

export const ROLES = {
  SUPER_ADMIN: 'superadmin',
  FACILITY_ADMIN: 'facilityadmin',
  PATIENT: 'patient',
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

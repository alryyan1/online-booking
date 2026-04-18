export const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

/**
 * Gets the Arabic day name for a given date.
 * @param {Date} date 
 * @returns {string}
 */
export const getDayName = (date) => {
  return DAYS_AR[date.getDay()]
}

/**
 * Formats a date to YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
export const formatDate = (date) => {
  return date.toISOString().split('T')[0]
}

/**
 * Checks if a doctor is working on a specific date.
 * @param {object} doctor 
 * @param {Date} date 
 * @returns {object|null} Shifts if working, null otherwise
 */
export const getWorkingShifts = (doctor, date) => {
  const dayName = getDayName(date)
  const schedule = doctor.workingSchedule?.[dayName]
  if (!schedule) return null
  
  const shifts = []
  if (schedule.morning) shifts.push({ type: 'morning', label: 'صباحاً', ...schedule.morning })
  if (schedule.evening) shifts.push({ type: 'evening', label: 'مساءً', ...schedule.evening })
  
  return shifts.length > 0 ? shifts : null
}

/**
 * Finds the next 7 available booking days for a doctor starting from tomorrow.
 * @param {object} doctor 
 * @returns {Array} List of { date, dayName, shifts }
 */
export const getAvailableBookingDays = (doctor) => {
  const availableDays = []
  const today = new Date()
  
  // Check next 14 days to find up to 7 available days
  for (let i = 1; i <= 14 && availableDays.length < 7; i++) {
    const checkDate = new Date()
    checkDate.setDate(today.getDate() + i)
    
    const shifts = getWorkingShifts(doctor, checkDate)
    if (shifts) {
      availableDays.push({
        date: formatDate(checkDate),
        dayName: getDayName(checkDate),
        shifts
      })
    }
  }
  
  return availableDays
}

/**
 * Gets the earliest available date for a doctor.
 * Used for sorting.
 * @param {object} doctor 
 * @returns {string} YYYY-MM-DD or '9999-99-99'
 */
export const getEarliestAvailableDate = (doctor) => {
  const available = getAvailableBookingDays(doctor)
  return available.length > 0 ? available[0].date : '9999-99-99'
}

/**
 * Checks if a specific time string falls within a start and end range.
 * @param {string} time "HH:mm"
 * @param {string} start "HH:mm"
 * @param {string} end "HH:mm"
 * @returns {boolean}
 */
export const isTimeInRange = (time, start, end) => {
  if (!time || !start || !end) return false
  const t = time.split(':').join('')
  const s = start.split(':').join('')
  const e = end.split(':').join('')
  return t >= s && t <= e
}

/**
 * Categorizes a list of booked slots into morning and evening shifts.
 * @param {Array} bookedSlots List of "HH:mm" strings
 * @param {object} daySchedule The workingSchedule for a specific day
 * @returns {object} { morning: count, evening: count }
 */
export const categorizeSlotsByShift = (appointments, daySchedule) => {
  const counts = { morning: 0, evening: 0 }
  if (!daySchedule || !appointments) return counts

  appointments.forEach((apt) => {
    // Skip only if explicitly canceled
    if (apt.status === 'canceled') return

    // 1. Explicit period field (prioritized)
    if (apt.period === 'morning') {
      counts.morning++
      return
    }
    if (apt.period === 'evening') {
      counts.evening++
      return
    }

    // 2. Fallback to time range (from Patient App)
    const time = apt.time || apt.timeSlot
    if (daySchedule.morning && isTimeInRange(time, daySchedule.morning.start, daySchedule.morning.end)) {
      counts.morning++
    } else if (daySchedule.evening && isTimeInRange(time, daySchedule.evening.start, daySchedule.evening.end)) {
      counts.evening++
    }
  })

  return counts
}

import { format, parseISO, isToday, isBefore, startOfDay } from 'date-fns'
import { ar } from 'date-fns/locale'

export const formatDate = (date) => {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM-dd')
}

export const formatDateArabic = (date) => {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMMM yyyy', { locale: ar })
}

export const formatDateTime = (date) => {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy HH:mm')
}

export const isPastDate = (dateStr) => {
  const date = parseISO(dateStr)
  return isBefore(date, startOfDay(new Date())) && !isToday(date)
}

export const getTodayString = () => format(new Date(), 'yyyy-MM-dd')

export const getMinDate = () => getTodayString()

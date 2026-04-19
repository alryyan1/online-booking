import { useState, useEffect, useRef, useCallback } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { COLLECTIONS } from '../../utils/constants'
import { Bell } from 'lucide-react'
import { cn } from '../../lib/utils'

const STATUS_LABEL = {
  pending:   { label: 'قيد الانتظار', cls: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'مؤكد',         cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ملغي',         cls: 'bg-red-100 text-red-700' },
  completed: { label: 'مكتمل',        cls: 'bg-blue-100 text-blue-700' },
}

function timeAgo(ts) {
  if (!ts) return ''
  const sec = Math.floor((Date.now() - ts.toMillis()) / 1000)
  if (sec < 60) return 'الآن'
  const min = Math.floor(sec / 60)
  if (min < 60) return `منذ ${min} دقيقة`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `منذ ${hr} ساعة`
  return `منذ ${Math.floor(hr / 24)} يوم`
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function showWindowsNotification(appointment) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const title = 'حجز جديد'
  const body = [
    appointment.patientName || appointment.userName || 'مريض',
    appointment.doctorName || appointment.specName,
  ].filter(Boolean).join(' — ')
  const n = new Notification(title, { body, icon: '/logo.png', dir: 'rtl' })
  setTimeout(() => n.close(), 6000)
}

// Tiny programmatic chime — no audio file needed
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [880, 1100, 1320]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.22)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.25)
    })
  } catch { /* AudioContext not available */ }
}

const MAX_SHOWN = 20

export default function NotificationBell({ facilityId }) {
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const initializedRef = useRef(false)
  const knownIdsRef = useRef(new Set())

  useEffect(() => { requestNotificationPermission() }, [])

  useEffect(() => {
    if (!facilityId) return
    const q = query(
      collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS),
      orderBy('createdAt', 'desc'),
      limit(MAX_SHOWN)
    )

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

      if (!initializedRef.current) {
        // First load — seed known IDs silently
        initializedRef.current = true
        docs.forEach((d) => knownIdsRef.current.add(d.id))
        setNotifications(docs)
        return
      }

      // Detect genuinely new docs
      const newOnes = docs.filter((d) => !knownIdsRef.current.has(d.id))
      if (newOnes.length > 0) {
        newOnes.forEach((d) => knownIdsRef.current.add(d.id))
        playChime()
        newOnes.forEach(showWindowsNotification)
        setUnread((n) => n + newOnes.length)
      }

      setNotifications(docs)
    })

    return unsub
  }, [facilityId])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = useCallback(() => {
    setOpen((v) => {
      if (!v) setUnread(0)
      return !v
    })
  }, [])

  if (!facilityId) return null

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className={cn(
          'relative flex items-center justify-center h-8 w-8 rounded-full transition-colors',
          open ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        )}
        aria-label="الإشعارات"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute left-0 top-10 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-800">الحجوزات الجديدة</span>
            <span className="text-[10px] text-gray-400">آخر {MAX_SHOWN}</span>
          </div>

          {/* List */}
          <ul className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <li className="py-10 text-center text-sm text-gray-400">لا توجد حجوزات</li>
            ) : (
              notifications.map((n) => {
                const st = STATUS_LABEL[n.status] ?? { label: n.status, cls: 'bg-gray-100 text-gray-600' }
                return (
                  <li key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    {/* Avatar circle */}
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                      {(n.patientName || n.userName || '؟').slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {n.patientName || n.userName || 'مريض'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {n.doctorName || n.specName || '—'}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', st.cls)}>
                          {st.label}
                        </span>
                        <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

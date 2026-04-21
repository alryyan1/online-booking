import { useMemo, useState } from 'react'
import {
  CalendarDays, XCircle, Sun, Moon, Stethoscope, TrendingUp,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { useAppointments } from '../../hooks/useAppointments'
import Spinner from '../../components/common/Spinner'

// ── helpers ──────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10)

const offsetDate = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── sub-components ────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, colorClass, bgClass }) => (
  <div className={cn('rounded-xl border p-5 flex flex-col gap-3', bgClass)}>
    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClass)}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  </div>
)

const ProgressBar = ({ label, value, total, colorClass }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-800">{value} <span className="text-gray-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

const SectionCard = ({ title, badge, children }) => (
  <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
      <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      {badge && <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">{badge}</span>}
    </div>
    <div className="p-5">{children}</div>
  </div>
)

const Empty = () => (
  <p className="text-center text-gray-400 text-sm py-6">لا توجد بيانات</p>
)

// ── FILTERS ───────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'today', label: 'اليوم' },
  { key: 'week',  label: 'هذا الأسبوع' },
  { key: 'month', label: 'هذا الشهر' },
]

// ── MAIN PAGE ─────────────────────────────────────────────────────────
const Statistics = () => {
  const { facilityId } = useAuth()
  const { appointments, loading } = useAppointments(facilityId)
  const [filter, setFilter] = useState('week')

  const filteredAppointments = useMemo(() => {
    const today = todayStr()
    if (filter === 'today') return appointments.filter((a) => a.date === today)
    if (filter === 'week')  return appointments.filter((a) => a.date >= offsetDate(-6) && a.date <= today)
    if (filter === 'month') return appointments.filter((a) => a.date >= offsetDate(-29) && a.date <= today)
    return appointments
  }, [appointments, filter])

  const total = filteredAppointments.length

  const canceledCount = useMemo(
    () => filteredAppointments.filter((a) => a.status === 'canceled').length,
    [filteredAppointments]
  )

  const morningCount = useMemo(
    () => filteredAppointments.filter((a) => a.period === 'morning').length,
    [filteredAppointments]
  )

  const eveningCount = useMemo(
    () => filteredAppointments.filter((a) => a.period === 'evening').length,
    [filteredAppointments]
  )

  const statusCounts = useMemo(() => {
    return filteredAppointments.reduce(
      (acc, a) => { const s = a.status ?? 'pending'; acc[s] = (acc[s] ?? 0) + 1; return acc },
      { pending: 0, confirmed: 0, canceled: 0 }
    )
  }, [filteredAppointments])

  const topDoctors = useMemo(() => {
    const map = {}
    filteredAppointments.forEach((a) => {
      const key = a.doctorId || a.doctorName
      if (!key) return
      if (!map[key]) map[key] = { name: a.doctorName || a.doctorId || '—', count: 0 }
      map[key].count += 1
    })
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10)
  }, [filteredAppointments])

  const specStats = useMemo(() => {
    const map = {}
    filteredAppointments.forEach((a) => {
      const key = a.specializationName || 'غير محدد'
      map[key] = (map[key] ?? 0) + 1
    })
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [filteredAppointments])

  const trendDays = filter === 'today' ? 1 : filter === 'week' ? 7 : 30
  const dailyTrend = useMemo(() => {
    const days = Array.from({ length: trendDays }, (_, i) => offsetDate(-(trendDays - 1 - i)))
    const map = Object.fromEntries(days.map((d) => [d, 0]))
    filteredAppointments.forEach((a) => { if (a.date && map[a.date] !== undefined) map[a.date] += 1 })
    return days.map((d) => ({ date: d, count: map[d] }))
  }, [filteredAppointments, trendDays])

  const maxDoctorCount = Math.max(...topDoctors.map((d) => d.count), 1)
  const maxSpecCount   = Math.max(...specStats.map((s) => s.count), 1)
  const maxDailyCount  = Math.max(...dailyTrend.map((r) => r.count), 1)

  if (loading) return <Spinner size="lg" />

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir="rtl">

      {/* Header + filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">الإحصائيات</h1>
          <p className="text-sm text-gray-500 mt-0.5">نظرة عامة على نشاط الحجوزات</p>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1">
          {FILTERS.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? 'default' : 'ghost'}
              onClick={() => setFilter(key)}
              className={cn(
                'h-7 text-xs rounded-md',
                filter !== key && 'text-gray-600 hover:text-gray-900'
              )}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="إجمالي المواعيد" value={total}         icon={CalendarDays} colorClass="bg-blue-100 text-blue-600"   bgClass="bg-blue-50 border-blue-100" />
        <StatCard label="ملغاة"            value={canceledCount} icon={XCircle}      colorClass="bg-red-100 text-red-500"     bgClass="bg-red-50 border-red-100" />
        <StatCard label="صباحاً"           value={morningCount}  icon={Sun}          colorClass="bg-amber-100 text-amber-500" bgClass="bg-amber-50 border-amber-100" />
        <StatCard label="مساءً"            value={eveningCount}  icon={Moon}         colorClass="bg-indigo-100 text-indigo-500" bgClass="bg-indigo-50 border-indigo-100" />
      </div>

      {/* Status breakdown + period */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <SectionCard title="توزيع حالات المواعيد">
          {total === 0 ? <Empty /> : (
            <>
              <ProgressBar label="قيد الانتظار" value={statusCounts.pending}   total={total} colorClass="bg-amber-400" />
              <ProgressBar label="مؤكدة"          value={statusCounts.confirmed} total={total} colorClass="bg-emerald-500" />
              <ProgressBar label="ملغاة"           value={statusCounts.canceled}  total={total} colorClass="bg-red-500" />
            </>
          )}
        </SectionCard>

        <SectionCard title="توزيع الفترات الزمنية">
          {total === 0 ? <Empty /> : (
            <>
              <ProgressBar label="صباحاً" value={morningCount} total={total} colorClass="bg-amber-400" />
              <ProgressBar label="مساءً"  value={eveningCount} total={total} colorClass="bg-indigo-500" />
            </>
          )}
        </SectionCard>
      </div>

      {/* Top doctors */}
      <div className="mb-4">
        <SectionCard title="أعلى الأطباء حجزاً" badge={`أعلى ${topDoctors.length}`}>
          {topDoctors.length === 0 ? <Empty /> : (
            <div className="space-y-4">
              {topDoctors.map((doc, i) => (
                <div key={doc.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{doc.name}</span>
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2.5 py-0.5 font-semibold">
                      {doc.count} موعد
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${(doc.count / maxDoctorCount) * 100}%` }}
                    />
                  </div>
                  {i < topDoctors.length - 1 && <hr className="mt-4 border-gray-100" />}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Specialty + daily trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="توزيع التخصصات">
          {specStats.length === 0 ? <Empty /> : (
            <div className="space-y-3">
              {specStats.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-purple-400" />
                      {s.name}
                    </span>
                    <span className="font-semibold text-gray-800">{s.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all duration-500"
                      style={{ width: `${(s.count / maxSpecCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={`آخر ${trendDays === 1 ? 'يوم' : trendDays + ' يوم'}`}>
          {total === 0 ? <Empty /> : (
            <div>
              <div className="flex items-end gap-1 h-24">
                {dailyTrend.map(({ date, count }) => (
                  <div
                    key={date}
                    title={`${date}: ${count} موعد`}
                    className="flex-1 flex flex-col items-center gap-1 cursor-default group"
                  >
                    <div
                      className={cn(
                        'w-full rounded-t transition-all duration-500',
                        count > 0 ? 'bg-blue-500 group-hover:bg-blue-600' : 'bg-gray-100'
                      )}
                      style={{ height: `${Math.max((count / maxDailyCount) * 72, count > 0 ? 4 : 2)}px` }}
                    />
                    <span className="text-gray-400 leading-none" style={{ fontSize: 9 }}>
                      {new Date(date + 'T12:00:00').getDate()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-gray-400">
                  المتوسط اليومي: {trendDays > 0 ? (total / trendDays).toFixed(1) : 0} موعد
                </span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

    </div>
  )
}

export default Statistics

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { pdf, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { useAuth } from '../../contexts/AuthContext'
import { getSpecializations, getDoctorsBySpec, updateDoctorInSpec } from '../../services/facilityService'
import { Search, X, Stethoscope, Sun, Moon, FileDown, Pencil, Check, User } from 'lucide-react'
import Spinner from '../../components/common/Spinner'
import { cn } from '../../lib/utils'

Font.register({
  family: 'Tajawal',
  fonts: [
    { src: '/Tajawal-Regular.ttf', fontWeight: 400 },
    { src: '/Tajawal-Bold.ttf', fontWeight: 700 },
  ],
})

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

// ─── PDF ───────────────────────────────────────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page: { padding: 15, fontFamily: 'Tajawal', direction: 'rtl', fontSize: 8 },
  title: { fontSize: 13, textAlign: 'center', marginBottom: 10, fontFamily: 'Tajawal' },
  table: { display: 'table', width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#000' },
  row: { flexDirection: 'row-reverse' },
  headerRow: { flexDirection: 'row-reverse', backgroundColor: '#f3f4f6' },
  cellBase: { borderStyle: 'solid', borderWidth: 0.5, borderColor: '#000', padding: 4, textAlign: 'center', fontFamily: 'Tajawal' },
  specCell: { width: '12%' },
  docCell: { width: '15%', textAlign: 'right' },
  dayCell: { width: `${73 / 7}%` },
  headerText: { fontFamily: 'Tajawal', fontSize: 8, textAlign: 'center' },
  cellText: { fontFamily: 'Tajawal', fontSize: 7 },
})

const SchedulePDF = ({ specs, doctorsBySpec }) => {
  const fmt = (ds) => {
    if (!ds) return '-'
    const m = ds.morning ? `ص: ${ds.morning.start}-${ds.morning.end}` : ''
    const e = ds.evening ? `م: ${ds.evening.start}-${ds.evening.end}` : ''
    return [m, e].filter(Boolean).join('\n') || '-'
  }
  const allRows = specs.flatMap((spec) => (doctorsBySpec[spec.id] || []).map((doc) => ({ spec, doc })))
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>{'جدول عمل الأطباء — ' + new Date().toLocaleDateString('ar-EG')}</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.headerRow}>
            {DAYS.map((d) => (
              <View key={d} style={[pdfStyles.cellBase, pdfStyles.dayCell]}>
                <Text style={pdfStyles.headerText}>{d}</Text>
              </View>
            ))}
            <View style={[pdfStyles.cellBase, pdfStyles.docCell]}><Text style={pdfStyles.headerText}>الطبيب</Text></View>
            <View style={[pdfStyles.cellBase, pdfStyles.specCell]}><Text style={pdfStyles.headerText}>التخصص</Text></View>
          </View>
          {allRows.map(({ spec, doc }) => (
            <View key={doc.id} style={pdfStyles.row}>
              {DAYS.map((day) => (
                <View key={day} style={[pdfStyles.cellBase, pdfStyles.dayCell]}>
                  <Text style={pdfStyles.cellText}>{fmt(doc.workingSchedule?.[day])}</Text>
                </View>
              ))}
              <View style={[pdfStyles.cellBase, pdfStyles.docCell]}><Text style={pdfStyles.cellText}>{doc.docName}</Text></View>
              <View style={[pdfStyles.cellBase, pdfStyles.specCell]}><Text style={pdfStyles.cellText}>{spec.specName}</Text></View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

// ─── Day cell editor (popover) ─────────────────────────────────────────────────
const EMPTY_SHIFT = { enabled: false, start: '08:00', end: '14:00' }

function DayCell({ doc, specId, day, facilityId, onSaved }) {
  const ds = doc.workingSchedule?.[day]
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [morning, setMorning] = useState({
    enabled: !!ds?.morning,
    start: ds?.morning?.start || '08:00',
    end: ds?.morning?.end || '14:00',
  })
  const [evening, setEvening] = useState({
    enabled: !!ds?.evening,
    start: ds?.evening?.start || '16:00',
    end: ds?.evening?.end || '22:00',
  })
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    // Re-sync with latest doc data
    const cur = doc.workingSchedule?.[day]
    setMorning({ enabled: !!cur?.morning, start: cur?.morning?.start || '08:00', end: cur?.morning?.end || '14:00' })
    setEvening({ enabled: !!cur?.evening, start: cur?.evening?.start || '16:00', end: cur?.evening?.end || '22:00' })
    setOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const newDay = {}
      if (morning.enabled) newDay.morning = { start: morning.start, end: morning.end }
      if (evening.enabled) newDay.evening = { start: evening.start, end: evening.end }

      const newSchedule = { ...(doc.workingSchedule || {}), [day]: Object.keys(newDay).length ? newDay : null }
      if (!Object.keys(newDay).length) delete newSchedule[day]

      await updateDoctorInSpec(facilityId, specId, doc.id, { workingSchedule: newSchedule })
      onSaved(doc.id, newSchedule)
      toast.success('تم الحفظ')
      setOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const hasData = ds?.morning || ds?.evening

  return (
    <td className="relative px-1.5 py-1.5 text-center align-middle" ref={ref}>
      {/* Display */}
      <button
        onClick={handleOpen}
        className={cn(
          'group w-full min-w-21 rounded-md border px-1.5 py-1 text-left transition hover:border-blue-300 hover:bg-blue-50',
          hasData ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-transparent'
        )}
      >
        {hasData ? (
          <div className="space-y-0.5">
            {ds.morning && (
              <div className="flex items-center gap-0.5">
                <Sun className="h-2.5 w-2.5 shrink-0 text-amber-400" />
                <span className="text-[10px] font-medium text-gray-700" dir="ltr">
                  {ds.morning.start}–{ds.morning.end}
                </span>
              </div>
            )}
            {ds.evening && (
              <div className="flex items-center gap-0.5">
                <Moon className="h-2.5 w-2.5 shrink-0 text-indigo-400" />
                <span className="text-[10px] font-medium text-gray-700" dir="ltr">
                  {ds.evening.start}–{ds.evening.end}
                </span>
              </div>
            )}
          </div>
        ) : (
          <span className="flex items-center justify-center text-gray-300 group-hover:text-blue-400">
            <Pencil className="h-3 w-3" />
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute top-full left-1/2 z-50 mt-1 w-56 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-2.5 text-center text-xs font-bold text-gray-700">{day}</p>

          {/* Morning */}
          <ShiftEditor
            icon={<Sun className="h-3.5 w-3.5 text-amber-400" />}
            label="صباحاً"
            value={morning}
            onChange={setMorning}
          />

          {/* Evening */}
          <ShiftEditor
            icon={<Moon className="h-3.5 w-3.5 text-indigo-400" />}
            label="مساءً"
            value={evening}
            onChange={setEvening}
          />

          {/* Actions */}
          <div className="mt-3 flex gap-1.5">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded-md border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
            >
              {saving
                ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <Check className="h-3 w-3" />}
              حفظ
            </button>
          </div>
        </div>
      )}
    </td>
  )
}

function ShiftEditor({ icon, label, value, onChange }) {
  return (
    <div className="mb-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
      <label className="mb-1.5 flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="h-3.5 w-3.5 rounded accent-blue-600"
        />
        {icon}
        <span className="text-[11px] font-semibold text-gray-700">{label}</span>
      </label>
      {/* {value.enabled && (
        <div className="flex items-center gap-1.5" dir="ltr">
          <input
            type="time"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
          <span className="text-[10px] text-gray-400 shrink-0">–</span>
          <input
            type="time"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
        </div>
      )} */}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CallCenterSchedule() {
  const { facilityId } = useAuth()
  const [specs, setSpecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [doctorsBySpec, setDoctorsBySpec] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const loadData = async () => {
    if (!facilityId) { setLoading(false); return }
    setLoading(true)
    try {
      const specData = await getSpecializations(facilityId)
      const sorted = specData
        .filter((s) => s.isActive !== false)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      setSpecs(sorted)

      const results = await Promise.all(
        sorted.map(async (spec) => {
          try { return { specId: spec.id, docs: await getDoctorsBySpec(facilityId, spec.id) } }
          catch { return { specId: spec.id, docs: [] } }
        })
      )
      const map = {}
      results.forEach(({ specId, docs }) => { map[specId] = docs })
      setDoctorsBySpec(map)
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء تحميل البيانات')
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [facilityId])

  // Called by DayCell after a successful save — update local state without refetch
  const handleScheduleSaved = (docId, newSchedule) => {
    setDoctorsBySpec((prev) => {
      const next = { ...prev }
      for (const specId of Object.keys(next)) {
        next[specId] = next[specId].map((d) =>
          d.id === docId ? { ...d, workingSchedule: newSchedule } : d
        )
      }
      return next
    })
  }

  const rows = specs.flatMap((spec) => {
    const doctors = doctorsBySpec[spec.id] || []
    const term = searchTerm.toLowerCase().trim()
    const filtered = term
      ? doctors.filter((d) =>
          d.docName.toLowerCase().includes(term) ||
          spec.specName.toLowerCase().includes(term) ||
          d.phoneNumber?.includes(term)
        )
      : doctors
    return filtered.map((doc) => ({ spec, doc }))
  })

  const handleDownloadPDF = async () => {
    if (!specs.length) return
    setIsExporting(true)
    const toastId = toast.loading('جاري إنشاء التقرير...')
    try {
      const blob = await pdf(<SchedulePDF specs={specs} doctorsBySpec={doctorsBySpec} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `جدول-الأطباء-${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('تم تحميل التقرير', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء التصدير', { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) return <Spinner size="lg" />

  return (
    <div className="mx-auto max-w-350 px-4 py-6 md:px-6">

      {/* ── Header ── */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">جدول عمل الأطباء</h1>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting || !specs.length}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isExporting
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <FileDown className="h-3.5 w-3.5" />}
              {isExporting ? 'جاري التحضير...' : 'تحميل PDF'}
            </button>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">انقر على أي خانة يوم لتعديل أوقات دوام الطبيب</p>
        </div>

        <div className="relative w-72">
          <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الطبيب أو التخصص..."
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pr-8 pl-7 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Empty states ── */}
      {specs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <Stethoscope className="mb-3 h-14 w-14 text-gray-200" />
          <p className="text-sm text-gray-400">لا توجد تخصصات مسجلة للمركز</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <p className="text-sm text-gray-400">لا توجد نتائج تطابق "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')} className="mt-2 text-xs text-blue-600 hover:underline">عرض الكل</button>
        </div>
      ) : (

        /* ── Table ── */
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">التخصص</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">الطبيب</th>
                  {DAYS.map((day) => (
                    <th key={day} className="px-2 py-2.5 text-center whitespace-nowrap">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(({ spec, doc }) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap align-middle">
                      {spec.specName}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 overflow-hidden">
                          {doc.photoUrl
                            ? <img src={doc.photoUrl} alt={doc.docName} className="h-full w-full object-cover" />
                            : <User className="h-3.5 w-3.5 text-blue-400" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 leading-tight whitespace-nowrap">{doc.docName}</p>
                          {doc.phoneNumber && (
                            <p className="text-[11px] text-gray-400" dir="ltr">{doc.phoneNumber}</p>
                          )}
                        </div>
                        {!doc.isActive && (
                          <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-500">
                            غير نشط
                          </span>
                        )}
                      </div>
                    </td>
                    {DAYS.map((day) => (
                      <DayCell
                        key={day}
                        doc={doc}
                        specId={spec.id}
                        day={day}
                        facilityId={facilityId}
                        onSaved={handleScheduleSaved}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

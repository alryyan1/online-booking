import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useAuth } from '../../contexts/AuthContext'
import {
  getSpecializations,
  getDoctorsBySpec,
} from '../../services/facilityService'
import Spinner from '../../components/common/Spinner'

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const CallCenterSchedule = () => {
  const { facilityId } = useAuth()
  const [specs, setSpecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [doctorsBySpec, setDoctorsBySpec] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const scheduleRef = useRef(null)
  const reportRef = useRef(null)

  const loadSpecsAndAllDoctors = async () => {
    if (!facilityId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      // 1. Load Specs
      const specData = await getSpecializations(facilityId)
      const sortedSpecs = [...specData].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      setSpecs(sortedSpecs)

      // 2. Load all doctors in parallel for better search experience
      const doctorPromises = sortedSpecs.map(async (spec) => {
        try {
          const docs = await getDoctorsBySpec(facilityId, spec.id)
          return { specId: spec.id, docs }
        } catch (e) {
          console.error(`Error loading docs for ${spec.id}`, e)
          return { specId: spec.id, docs: [] }
        }
      })

      const results = await Promise.all(doctorPromises)
      const newDocsBySpec = {}
      results.forEach(({ specId, docs }) => {
        newDocsBySpec[specId] = docs
      })
      setDoctorsBySpec(newDocsBySpec)

    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء تحميل البيانات')
    }
    setLoading(false)
  }

  useEffect(() => { loadSpecsAndAllDoctors() }, [facilityId])

  const toggleExpand = (specId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(specId)) {
        next.delete(specId)
      } else {
        next.add(specId)
      }
      return next
    })
  }

  // Smart filtering logic
  const filteredSpecs = specs.filter(spec => {
    if (!searchTerm.trim()) return true

    const term = searchTerm.toLowerCase()
    const specMatches = spec.specName.toLowerCase().includes(term)

    const docs = doctorsBySpec[spec.id] || []
    const docMatches = docs.some(d =>
      d.docName.toLowerCase().includes(term) ||
      d.phoneNumber?.includes(term)
    )

    return specMatches || docMatches
  })

  // Auto-expand logically during search
  useEffect(() => {
    if (searchTerm.trim()) {
      const matchingIds = new Set()
      filteredSpecs.forEach(s => matchingIds.add(s.id))
      setExpandedIds(matchingIds)
    }
  }, [searchTerm])

  const handleDownloadPDF = async () => {
    if (!specs.length) return

    setIsExporting(true)
    const toastId = toast.loading('جاري إنشاء التقرير الشامل...', { id: 'pdf-gen' })

    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const margin = 10
      const contentWidth = pdfWidth - (margin * 2)

      // We will capture each specialization section individually to ensure nothing is cut off
      const reportEl = reportRef.current
      reportEl.style.display = 'block'
      reportEl.style.position = 'absolute'
      reportEl.style.left = '-9999px'
      reportEl.style.width = `${contentWidth}mm`

      const specSections = reportEl.querySelectorAll('.spec-report-section')

      let currentY = 15 // Track Y position

      for (let i = 0; i < specSections.length; i++) {
        const section = specSections[i]

        // Update toast progress (Header is index 0)
        const progressText = i === 0
          ? 'جاري معالجة عنوان التقرير...'
          : `جاري معالجة تخصص: ${specs[i - 1]?.specName || ''} (${i}/${specs.length})`

        toast.loading(progressText, { id: toastId })

        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: false,
          backgroundColor: '#ffffff',
          windowWidth: 1200
        })

        const imgData = canvas.toDataURL('image/png')
        const imgProps = pdf.getImageProperties(imgData)
        const itemHeight = (imgProps.height * contentWidth) / imgProps.width

        // Logic for page breaks:
        // i=0 is Header, i=1 is First Spec. We want them on the same page.
        // i > 1 means Second Spec onwards, we start a new page.
        if (i > 1) {
          pdf.addPage()
          currentY = 15
        }

        pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, itemHeight)

        // Increase currentY for the next element on the SAME page (only happens after Header)
        currentY += itemHeight + 5
      }

      pdf.save(`تقرير-المواعيد-${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.pdf`)
      toast.success('تم تحميل التقرير الكامل بنجاح!', { id: toastId })
    } catch (error) {
      console.error('PDF Export Error:', error)
      toast.error('حدث خطأ أثناء تصدير التقرير الكامل', { id: 'pdf-gen' })
    } finally {
      setIsExporting(false)
      if (reportRef.current) reportRef.current.style.display = 'none'
    }
  }

  const renderScheduleDetail = (schedule) => {
    if (!schedule || Object.keys(schedule).length === 0) {
      return <p className="text-[10px] text-gray-400 italic">لا يوجد جدول عمل محدد</p>
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
        {DAYS.map((day) => {
          const daySchedule = schedule[day]
          if (!daySchedule || (!daySchedule.morning && !daySchedule.evening)) return null

          return (
            <div key={day} className="bg-gray-50/50 p-2 rounded-xl border border-gray-100 flex flex-col justify-between">
              <p className="text-[10px] font-black text-gray-400 mb-1 border-b border-gray-100/50 pb-1">{day}</p>
              <div className="space-y-1">
                {daySchedule.morning && (
                  <div className="flex items-center gap-1.5 text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_4px_rgba(251,146,60,0.4)]"></span>
                    <span className="text-gray-400 font-bold">صباحاً:</span>
                    <span className="font-black text-gray-700" dir="ltr">{daySchedule.morning.start} - {daySchedule.morning.end}</span>
                  </div>
                )}
                {daySchedule.evening && (
                  <div className="flex items-center gap-1.5 text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_4px_rgba(129,140,248,0.4)]"></span>
                    <span className="text-gray-400 font-bold">مساءً:</span>
                    <span className="font-black text-gray-700" dir="ltr">{daySchedule.evening.start} - {daySchedule.evening.end}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const formatDayCell = (daySchedule) => {
    if (!daySchedule) return '-'
    const morning = daySchedule.morning
    const evening = daySchedule.evening

    if (!morning && !evening) return '-'

    const m = morning ? `ص: ${morning.start}-${morning.end}` : ''
    const e = evening ? `م: ${evening.start}-${evening.end}` : ''
    return [m, e].filter(Boolean).join('\n')
  }

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-right">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-gray-800">جدول عمل الأطباء</h1>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="bg-indigo-600 text-white px-5 py-2 rounded-full text-xs font-black flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <span>📊</span>
              {isExporting ? 'جاري التحضير...' : 'تحميل Pdf'}
            </button>
          </div>
          <p className="text-gray-500">مراجعة مواعيد دوام الأطباء في مختلف التخصصات.</p>
        </div>

        {/* Global Search Interface */}
        <div className="relative w-full md:max-w-md group">
          <input
            type="text"
            placeholder="ابحث باسم الطبيب أو التخصص..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-right bg-white border-2 border-gray-100 rounded-2xl pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:border-purple-500 focus:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all font-bold placeholder:text-gray-300"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-purple-500 transition-colors text-xl">🔍</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Hidden Report View for PDF Capture */}
      <div ref={reportRef} style={{ display: 'none', width: '210mm', padding: '15mm', backgroundColor: '#fff', color: '#000', direction: 'rtl', fontFamily: 'Arial, sans-serif' }}>
        <div className="spec-report-section" style={{ textAlign: 'center', marginBottom: '10mm', borderBottom: '2px solid #000', paddingBottom: '3mm' }}>
          <h1 style={{ fontSize: '24pt', fontWeight: 'bold' }}>تقرير جدول عمل الأطباء</h1>
          <p style={{ fontSize: '12pt' }}>تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        {specs.map(spec => (
          <div key={spec.id} className="spec-report-section" style={{ marginBottom: '15mm', border: '1px solid #eee', padding: '5mm', borderRadius: '5mm', backgroundColor: '#fff' }}>
            <h2 style={{ fontSize: '16pt', fontWeight: 'bold', marginBottom: '4mm', color: '#4338ca', borderBottom: '1px solid #4338ca', paddingBottom: '2mm' }}>
              تخصص {spec.specName}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '9pt', textAlign: 'center' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '20%', fontWeight: 'bold' }}>اسم الطبيب</th>
                  {DAYS.map(day => <th key={day} style={{ border: '1px solid #000', padding: '4px', fontSize: '8pt' }}>{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {(doctorsBySpec[spec.id] || []).length === 0 ? (
                  <tr>
                    <td colSpan={DAYS.length + 1} style={{ border: '1px solid #000', padding: '10px', color: '#9ca3af' }}>لا يوجد أطباء مسجلين لهذا التخصص</td>
                  </tr>
                ) : (
                  (doctorsBySpec[spec.id] || []).map(doctor => (
                    <tr key={doctor.id}>
                      <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold', textAlign: 'right' }}>{doctor.docName}</td>
                      {DAYS.map(day => (
                        <td key={day} style={{ border: '1px solid #000', padding: '4px', fontSize: '7.5pt', whiteSpace: 'pre-line' }}>
                          {formatDayCell(doctor.workingSchedule?.[day])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div ref={scheduleRef}>
        {specs.length === 0 ? (
          <div className="text-center text-gray-400 py-32 bg-white rounded-3xl border border-gray-100 shadow-sm border-dashed">
            <div className="text-6xl mb-4 opacity-20">⚕️</div>
            <p className="font-bold text-lg">لا توجد تخصصات مسجلة للمركز</p>
          </div>
        ) : filteredSpecs.length === 0 ? (
          <div className="text-center text-gray-400 py-32 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="text-6xl mb-4 opacity-20">🔎</div>
            <p className="font-bold text-lg">لا توجد نتائج تطابق بحثك عن "{searchTerm}"</p>
            <button onClick={() => setSearchTerm('')} className="mt-4 text-purple-600 font-bold hover:underline">عرض الكل ←</button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredSpecs.map((spec) => {
              const isOpen = expandedIds.has(spec.id)
              const doctors = doctorsBySpec[spec.id] || []
              const term = searchTerm.toLowerCase()

              // Filter doctors in the list if search is active
              const visibleDoctors = !searchTerm.trim() ? doctors : doctors.filter(d =>
                d.docName.toLowerCase().includes(term) || (d.phoneNumber && d.phoneNumber.includes(term))
              )

              return (
                <div key={spec.id} className={`bg-white rounded-3xl border transition-all duration-300 ${isOpen ? 'border-purple-200 shadow-lg' : 'border-gray-100 shadow-sm hover:border-purple-100'}`}>
                  <button
                    onClick={() => toggleExpand(spec.id)}
                    className="w-full flex items-center justify-between px-6 py-5"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl transition-colors ${isOpen ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-50 text-purple-500'}`}>
                        {spec.specName.charAt(0)}
                      </div>
                      <div className="text-right">
                        <p className={`font-black tracking-tight ${isOpen ? 'text-purple-600' : 'text-gray-800'}`}>{spec.specName}</p>
                        <p className="text-xs text-gray-400 font-medium">{spec.description || 'جدول الأطباء المتوفرين'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full transition-colors ${isOpen ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-400'}`}>
                        {doctors.length} أطباء
                      </span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-gray-100 transition-all ${isOpen ? 'rotate-180 bg-purple-50 border-purple-100 text-purple-600' : 'text-gray-300'}`}>
                        ▼
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-6 py-6 border-t border-gray-50 bg-gray-50/30">
                      {visibleDoctors.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6 font-medium">لا يوجد أطباء مطابقين في هذا التخصص</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-6">
                          {visibleDoctors.map((doctor) => (
                            <div key={doctor.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow animate-in zoom-in-95 duration-300">
                              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 mb-5 border-b border-gray-50 pb-5">
                                <div className="flex items-center gap-4 text-right">
                                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                                    {doctor.photoUrl ? <img src={doctor.photoUrl} className="w-full h-full rounded-2xl object-cover" /> : '👨‍⚕️'}
                                  </div>
                                  <div>
                                    <p className="font-black text-gray-800 text-lg">{doctor.docName}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs text-blue-500 font-bold tracking-tight" dir="ltr">{doctor.phoneNumber || 'لا يوجد هاتف'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <span className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider ${doctor.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {doctor.isActive ? 'نشط الآن' : 'غير متوفر'}
                                  </span>
                                  <span className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider ${doctor.isBookingEnabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {doctor.isBookingEnabled ? 'حجز متاح' : 'الحجز مقفل'}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="w-1.5 h-3 bg-purple-500 rounded-full"></span>
                                  <p className="text-[11px] font-black text-gray-800 uppercase tracking-widest">المواعيد الأسبوعية</p>
                                </div>
                                {renderScheduleDetail(doctor.workingSchedule)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default CallCenterSchedule

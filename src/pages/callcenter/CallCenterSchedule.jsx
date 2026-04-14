import { useEffect, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useAuth } from '../../contexts/AuthContext'
import { getSpecializations, getDoctorsBySpec } from '../../services/facilityService'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Card from '@mui/material/Card'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Collapse from '@mui/material/Collapse'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PeopleIcon from '@mui/icons-material/People'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import PersonIcon from '@mui/icons-material/Person'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
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
    if (!facilityId) { setLoading(false); return }
    setLoading(true)
    try {
      const specData = await getSpecializations(facilityId)
      const sortedSpecs = [...specData].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      setSpecs(sortedSpecs)

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
      results.forEach(({ specId, docs }) => { newDocsBySpec[specId] = docs })
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
      if (next.has(specId)) next.delete(specId)
      else next.add(specId)
      return next
    })
  }

  const filteredSpecs = specs.filter((spec) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    const specMatches = spec.specName.toLowerCase().includes(term)
    const docs = doctorsBySpec[spec.id] || []
    const docMatches = docs.some((d) => d.docName.toLowerCase().includes(term) || d.phoneNumber?.includes(term))
    return specMatches || docMatches
  })

  useEffect(() => {
    if (searchTerm.trim()) {
      const matchingIds = new Set()
      filteredSpecs.forEach((s) => matchingIds.add(s.id))
      setExpandedIds(matchingIds)
    }
  }, [searchTerm])

  const handleDownloadPDF = async () => {
    if (!specs.length) return
    setIsExporting(true)
    const toastId = toast.loading('جاري إنشاء التقرير الشامل...', { id: 'pdf-gen' })
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const margin = 10
      const contentWidth = pdfWidth - margin * 2

      const reportEl = reportRef.current
      reportEl.style.display = 'block'
      reportEl.style.position = 'absolute'
      reportEl.style.left = '-9999px'
      reportEl.style.width = `${contentWidth}mm`

      const specSections = reportEl.querySelectorAll('.spec-report-section')
      let currentY = 15

      for (let i = 0; i < specSections.length; i++) {
        const section = specSections[i]
        const progressText = i === 0
          ? 'جاري معالجة عنوان التقرير...'
          : `جاري معالجة تخصص: ${specs[i - 1]?.specName || ''} (${i}/${specs.length})`
        toast.loading(progressText, { id: toastId })

        const canvas = await html2canvas(section, { scale: 2, useCORS: false, backgroundColor: '#ffffff', windowWidth: 1200 })
        const imgData = canvas.toDataURL('image/png')
        const imgProps = pdf.getImageProperties(imgData)
        const itemHeight = (imgProps.height * contentWidth) / imgProps.width

        if (i > 1) { pdf.addPage(); currentY = 15 }
        pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, itemHeight)
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
      return <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>لا يوجد جدول عمل محدد</Typography>
    }

    const activeDays = DAYS.filter((day) => {
      const d = schedule[day]
      return d && (d.morning || d.evening)
    })

    if (activeDays.length === 0) {
      return <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>لا يوجد جدول عمل محدد</Typography>
    }

    return (
      <Grid container spacing={1} sx={{ mt: 1 }}>
        {activeDays.map((day) => {
          const daySchedule = schedule[day]
          return (
            <Grid item xs={6} sm={4} md={3} key={day}>
              <Box sx={{ bgcolor: 'grey.50', border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ display: 'block', mb: 0.5, borderBottom: 1, borderColor: 'divider', pb: 0.5 }}>
                  {day}
                </Typography>
                <Stack spacing={0.5}>
                  {daySchedule.morning && (
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <WbSunnyIcon sx={{ fontSize: 10, color: 'orange' }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>صباحاً:</Typography>
                      <Typography variant="caption" fontWeight={700} dir="ltr">{daySchedule.morning.start} - {daySchedule.morning.end}</Typography>
                    </Stack>
                  )}
                  {daySchedule.evening && (
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <NightsStayIcon sx={{ fontSize: 10, color: 'indigo' }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>مساءً:</Typography>
                      <Typography variant="caption" fontWeight={700} dir="ltr">{daySchedule.evening.start} - {daySchedule.evening.end}</Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>
            </Grid>
          )
        })}
      </Grid>
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

  if (loading) return <Spinner size="lg" />

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', px: 3, py: 5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 5 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }}>
            <Typography variant="h5" fontWeight={700}>جدول عمل الأطباء</Typography>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<PictureAsPdfIcon />}
              onClick={handleDownloadPDF}
              disabled={isExporting}
            >
              {isExporting ? 'جاري التحضير...' : 'تحميل PDF'}
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">مراجعة مواعيد دوام الأطباء في مختلف التخصصات.</Typography>
        </Box>

        <TextField
          size="small"
          placeholder="ابحث باسم الطبيب أو التخصص..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ width: { xs: '100%', md: 320 } }}
        />
      </Box>

      {/* Hidden Report View for PDF Capture */}
      <div ref={reportRef} style={{ display: 'none', width: '210mm', padding: '15mm', backgroundColor: '#fff', color: '#000', direction: 'rtl', fontFamily: 'Arial, sans-serif' }}>
        <div className="spec-report-section" style={{ textAlign: 'center', marginBottom: '10mm', borderBottom: '2px solid #000', paddingBottom: '3mm' }}>
          <h1 style={{ fontSize: '24pt', fontWeight: 'bold' }}>تقرير جدول عمل الأطباء</h1>
          <p style={{ fontSize: '12pt' }}>تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>
        {specs.map((spec) => (
          <div key={spec.id} className="spec-report-section" style={{ marginBottom: '15mm', border: '1px solid #eee', padding: '5mm', borderRadius: '5mm', backgroundColor: '#fff' }}>
            <h2 style={{ fontSize: '16pt', fontWeight: 'bold', marginBottom: '4mm', color: '#4338ca', borderBottom: '1px solid #4338ca', paddingBottom: '2mm' }}>
              تخصص {spec.specName}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '9pt', textAlign: 'center' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '20%', fontWeight: 'bold' }}>اسم الطبيب</th>
                  {DAYS.map((day) => <th key={day} style={{ border: '1px solid #000', padding: '4px', fontSize: '8pt' }}>{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {(doctorsBySpec[spec.id] || []).length === 0 ? (
                  <tr>
                    <td colSpan={DAYS.length + 1} style={{ border: '1px solid #000', padding: '10px', color: '#9ca3af' }}>لا يوجد أطباء مسجلين لهذا التخصص</td>
                  </tr>
                ) : (
                  (doctorsBySpec[spec.id] || []).map((doctor) => (
                    <tr key={doctor.id}>
                      <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold', textAlign: 'right' }}>{doctor.docName}</td>
                      {DAYS.map((day) => (
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

      {/* Visible Schedule */}
      <Box ref={scheduleRef}>
        {specs.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 12 }}>
            <MedicalServicesIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">لا توجد تخصصات مسجلة للمركز</Typography>
          </Card>
        ) : filteredSpecs.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 12 }}>
            <Typography color="text.secondary">لا توجد نتائج تطابق بحثك عن "{searchTerm}"</Typography>
            <Button onClick={() => setSearchTerm('')} size="small" sx={{ mt: 1 }}>عرض الكل</Button>
          </Card>
        ) : (
          <Stack spacing={2}>
            {filteredSpecs.map((spec) => {
              const isOpen = expandedIds.has(spec.id)
              const doctors = doctorsBySpec[spec.id] || []
              const term = searchTerm.toLowerCase()
              const visibleDoctors = !searchTerm.trim()
                ? doctors
                : doctors.filter((d) => d.docName.toLowerCase().includes(term) || (d.phoneNumber && d.phoneNumber.includes(term)))

              return (
                <Card
                  key={spec.id}
                  variant="outlined"
                  sx={{
                    borderColor: isOpen ? 'primary.200' : 'divider',
                    boxShadow: isOpen ? 3 : 0,
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Spec Header Row */}
                  <Box
                    onClick={() => toggleExpand(spec.id)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2.5, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar
                        sx={{
                          width: 44, height: 44, fontWeight: 700, fontSize: '1.1rem',
                          bgcolor: isOpen ? 'primary.main' : 'primary.50',
                          color: isOpen ? 'white' : 'primary.main',
                        }}
                      >
                        {spec.specName.charAt(0)}
                      </Avatar>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography fontWeight={700} color={isOpen ? 'primary.main' : 'text.primary'}>{spec.specName}</Typography>
                        <Typography variant="caption" color="text.secondary">{spec.description || 'جدول الأطباء المتوفرين'}</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Chip
                        size="small"
                        icon={<PeopleIcon />}
                        label={`${doctors.length} أطباء`}
                        color={isOpen ? 'primary' : 'default'}
                        variant="outlined"
                      />
                      <ExpandMoreIcon
                        sx={{
                          color: isOpen ? 'primary.main' : 'text.disabled',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </Stack>
                  </Box>

                  {/* Doctors Collapse */}
                  <Collapse in={isOpen}>
                    <Divider />
                    <Box sx={{ p: 3, bgcolor: 'grey.50' }}>
                      {visibleDoctors.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
                          لا يوجد أطباء مطابقين في هذا التخصص
                        </Typography>
                      ) : (
                        <Stack spacing={2}>
                          {visibleDoctors.map((doctor) => (
                            <Card key={doctor.id} sx={{ p: 3 }}>
                              {/* Doctor header */}
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5, pb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Avatar
                                    src={doctor.photoUrl}
                                    sx={{ width: 52, height: 52, bgcolor: 'primary.50' }}
                                  >
                                    <PersonIcon color="primary" />
                                  </Avatar>
                                  <Box>
                                    <Typography variant="h6" fontWeight={700}>{doctor.docName}</Typography>
                                    <Typography variant="caption" color="primary" dir="ltr">{doctor.phoneNumber || 'لا يوجد هاتف'}</Typography>
                                  </Box>
                                </Stack>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                  <Chip
                                    size="small"
                                    label={doctor.isActive ? 'نشط الآن' : 'غير متوفر'}
                                    color={doctor.isActive ? 'success' : 'error'}
                                    variant="outlined"
                                  />
                                  <Chip
                                    size="small"
                                    label={doctor.isBookingEnabled ? 'حجز متاح' : 'الحجز مقفل'}
                                    color={doctor.isBookingEnabled ? 'primary' : 'default'}
                                    variant="outlined"
                                  />
                                </Stack>
                              </Box>

                              {/* Schedule */}
                              <Box>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                                  <Box sx={{ width: 4, height: 16, bgcolor: 'secondary.main', borderRadius: 1 }} />
                                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                    المواعيد الأسبوعية
                                  </Typography>
                                </Stack>
                                {renderScheduleDetail(doctor.workingSchedule)}
                              </Box>
                            </Card>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Collapse>
                </Card>
              )
            })}
          </Stack>
        )}
      </Box>
    </Box>
  )
}

export default CallCenterSchedule

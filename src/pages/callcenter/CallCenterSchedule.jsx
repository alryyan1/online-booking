import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { pdf, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import PersonIcon from '@mui/icons-material/Person'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import Spinner from '../../components/common/Spinner'

Font.register({
  family: 'Tajawal',
  fonts: [
    { src: '/Tajawal-Regular.ttf', fontWeight: 400 },
    { src: '/Tajawal-Bold.ttf', fontWeight: 700 },
  ],
})

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
  const formatCellText = (daySchedule) => {
    if (!daySchedule) return '-'
    const m = daySchedule.morning ? `ص: ${daySchedule.morning.start}-${daySchedule.morning.end}` : ''
    const e = daySchedule.evening ? `م: ${daySchedule.evening.start}-${daySchedule.evening.end}` : ''
    return [m, e].filter(Boolean).join('\n') || '-'
  }

  const allRows = specs.flatMap((spec) =>
    (doctorsBySpec[spec.id] || []).map((doc) => ({ spec, doc }))
  )

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>
          {'جدول عمل الأطباء — ' + new Date().toLocaleDateString('ar-EG')}
        </Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.headerRow}>
            {DAYS.map((d) => (
              <View key={d} style={[pdfStyles.cellBase, pdfStyles.dayCell]}>
                <Text style={pdfStyles.headerText}>{d}</Text>
              </View>
            ))}
            <View style={[pdfStyles.cellBase, pdfStyles.docCell]}>
              <Text style={pdfStyles.headerText}>الطبيب</Text>
            </View>
            <View style={[pdfStyles.cellBase, pdfStyles.specCell]}>
              <Text style={pdfStyles.headerText}>التخصص</Text>
            </View>
          </View>
          {allRows.map(({ spec, doc }) => (
            <View key={doc.id} style={pdfStyles.row}>
              {DAYS.map((day) => (
                <View key={day} style={[pdfStyles.cellBase, pdfStyles.dayCell]}>
                  <Text style={pdfStyles.cellText}>{formatCellText(doc.workingSchedule?.[day])}</Text>
                </View>
              ))}
              <View style={[pdfStyles.cellBase, pdfStyles.docCell]}>
                <Text style={pdfStyles.cellText}>{doc.docName}</Text>
              </View>
              <View style={[pdfStyles.cellBase, pdfStyles.specCell]}>
                <Text style={pdfStyles.cellText}>{spec.specName}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const CallCenterSchedule = () => {
  const { facilityId } = useAuth()
  const [specs, setSpecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [doctorsBySpec, setDoctorsBySpec] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const loadSpecsAndAllDoctors = async () => {
    if (!facilityId) { setLoading(false); return }
    setLoading(true)
    try {
      const specData = await getSpecializations(facilityId)
      const activeSpecs = specData.filter((s) => s.isActive !== false)
      const sortedSpecs = [...activeSpecs].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      setSpecs(sortedSpecs)

      const results = await Promise.all(
        sortedSpecs.map(async (spec) => {
          try {
            const docs = await getDoctorsBySpec(facilityId, spec.id)
            return { specId: spec.id, docs }
          } catch {
            return { specId: spec.id, docs: [] }
          }
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

  useEffect(() => { loadSpecsAndAllDoctors() }, [facilityId])

  // Flatten all doctors into rows, filtered by search
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

  const formatDayCell = (daySchedule) => {
    if (!daySchedule) return null
    const { morning, evening } = daySchedule
    if (!morning && !evening) return null
    return (
      <Stack spacing={0.25}>
        {morning && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <WbSunnyIcon sx={{ fontSize: 10, color: 'orange' }} />
            <Typography variant="caption" dir="ltr" sx={{ fontSize: '0.68rem' }}>
              {morning.start}–{morning.end}
            </Typography>
          </Stack>
        )}
        {evening && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <NightsStayIcon sx={{ fontSize: 10, color: '#5c6bc0' }} />
            <Typography variant="caption" dir="ltr" sx={{ fontSize: '0.68rem' }}>
              {evening.start}–{evening.end}
            </Typography>
          </Stack>
        )}
      </Stack>
    )
  }

  const handleDownloadPDF = async () => {
    if (!specs.length) return
    setIsExporting(true)
    const toastId = toast.loading('جاري إنشاء التقرير...', { id: 'pdf-gen' })
    try {
      const blob = await pdf(
        <SchedulePDF specs={specs} doctorsBySpec={doctorsBySpec} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `جدول-الأطباء-${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('تم تحميل التقرير', { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error('حدث خطأ أثناء التصدير', { id: 'pdf-gen' })
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) return <Spinner size="lg" />

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: 3, py: 5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }}>
            <Typography variant="h5" fontWeight={700}>جدول عمل الأطباء</Typography>
            <Button variant="contained" color="secondary" size="small" startIcon={<PictureAsPdfIcon />}
              onClick={handleDownloadPDF} disabled={isExporting}>
              {isExporting ? 'جاري التحضير...' : 'تحميل PDF'}
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">مراجعة مواعيد دوام الأطباء في مختلف التخصصات.</Typography>
        </Box>

        <TextField size="small" placeholder="ابحث باسم الطبيب أو التخصص..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* Visible Table */}
      {specs.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 12 }}>
          <MedicalServicesIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">لا توجد تخصصات مسجلة للمركز</Typography>
        </Card>
      ) : rows.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 12 }}>
          <Typography color="text.secondary">لا توجد نتائج تطابق "{searchTerm}"</Typography>
          <Button onClick={() => setSearchTerm('')} size="small" sx={{ mt: 1 }}>عرض الكل</Button>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>التخصص</TableCell>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>الطبيب</TableCell>
                  {DAYS.map((day) => (
                    <TableCell key={day} align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {day}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(({ spec, doc }) => (
                  <TableRow key={doc.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{spec.specName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar src={doc.photoUrl} sx={{ width: 32, height: 32, bgcolor: 'primary.50' }}>
                          <PersonIcon fontSize="small" color="primary" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{doc.docName}</Typography>
                          {doc.phoneNumber && (
                            <Typography variant="caption" color="text.secondary" dir="ltr">{doc.phoneNumber}</Typography>
                          )}
                        </Box>
                        {!doc.isActive && <Chip label="غير نشط" size="small" color="error" variant="outlined" />}
                      </Stack>
                    </TableCell>
                    {DAYS.map((day) => (
                      <TableCell key={day} align="center" sx={{ minWidth: 90 }}>
                        {formatDayCell(doc.workingSchedule?.[day]) ?? (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  )
}

export default CallCenterSchedule

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import AddIcon from '@mui/icons-material/Add'
import {
  getFacilityById,
  updateFacility,
  getSpecializations,
  addSpecialization,
  getInsuranceCompanies,
  addInsuranceCompany,
} from '../../services/facilityService'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const FacilityInfo = () => {
  const { facilityId } = useAuth()
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [specializations, setSpecializations] = useState([])
  const [newSpec, setNewSpec] = useState('')
  const [insurance, setInsurance] = useState([])
  const [newIns, setNewIns] = useState('')

  const load = async () => {
    const [f, s, i] = await Promise.all([getFacilityById(facilityId), getSpecializations(facilityId), getInsuranceCompanies(facilityId)])
    setFacility(f)
    setForm({ name: f.name, address: f.address || '', phone: f.phone || '' })
    setSpecializations(s)
    setInsurance(i)
    setLoading(false)
  }

  useEffect(() => { if (facilityId) load() }, [facilityId])

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { await updateFacility(facilityId, form); toast.success('تم حفظ معلومات المرفق') }
    catch { toast.error('حدث خطأ أثناء الحفظ') }
    finally { setSaving(false) }
  }

  const handleAddSpec = async (e) => {
    e.preventDefault()
    if (!newSpec.trim()) return
    await addSpecialization(facilityId, newSpec.trim())
    setNewSpec('')
    setSpecializations(await getSpecializations(facilityId))
    toast.success('تم إضافة التخصص')
  }

  const handleAddIns = async (e) => {
    e.preventDefault()
    if (!newIns.trim()) return
    await addInsuranceCompany(facilityId, newIns.trim())
    setNewIns('')
    setInsurance(await getInsuranceCompanies(facilityId))
    toast.success('تم إضافة شركة التأمين')
  }

  if (loading) return <Spinner size="lg" />

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', px: 3, py: 5 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 4 }}>معلومات المرفق</Typography>

      {/* Basic Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>البيانات الأساسية</Typography>
          <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="اسم المرفق" name="name" value={form.name || ''} onChange={handleChange} fullWidth />
            <TextField label="العنوان" name="address" value={form.address || ''} onChange={handleChange} fullWidth />
            <TextField label="رقم الهاتف" name="phone" type="tel" value={form.phone || ''} onChange={handleChange} fullWidth inputProps={{ dir: 'ltr' }} />
            <Button type="submit" variant="contained" disabled={saving} sx={{ alignSelf: 'flex-start' }}>
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Specializations */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>التخصصات الطبية</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            {specializations.length > 0
              ? specializations.map((s) => <Chip key={s.id} label={s.name} color="primary" variant="outlined" size="small" />)
              : <Typography variant="body2" color="text.secondary">لا توجد تخصصات بعد</Typography>
            }
          </Stack>
          <Box component="form" onSubmit={handleAddSpec}>
            <TextField
              size="small"
              value={newSpec}
              onChange={(e) => setNewSpec(e.target.value)}
              placeholder="أضف تخصصاً جديداً..."
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button type="submit" size="small" variant="contained" startIcon={<AddIcon />} disabled={!newSpec.trim()}>إضافة</Button>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Insurance Companies */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>شركات التأمين المعتمدة</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            {insurance.length > 0
              ? insurance.map((i) => <Chip key={i.id} label={i.name} color="success" variant="outlined" size="small" />)
              : <Typography variant="body2" color="text.secondary">لا توجد شركات تأمين بعد</Typography>
            }
          </Stack>
          <Box component="form" onSubmit={handleAddIns}>
            <TextField
              size="small"
              value={newIns}
              onChange={(e) => setNewIns(e.target.value)}
              placeholder="أضف شركة تأمين..."
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button type="submit" size="small" variant="contained" color="success" startIcon={<AddIcon />} disabled={!newIns.trim()}>إضافة</Button>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default FacilityInfo

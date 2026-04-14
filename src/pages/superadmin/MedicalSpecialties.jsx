import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Stack from '@mui/material/Stack'
import InputAdornment from '@mui/material/InputAdornment'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import DialogActions from '@mui/material/DialogActions'
import SearchIcon from '@mui/icons-material/Search'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import AddIcon from '@mui/icons-material/Add'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import { getSpecialties, createSpecialty, updateSpecialty, deleteSpecialty } from '../../services/specialtyService'
import toast from 'react-hot-toast'

const EMPTY = { name: '', description: '', imageUrl: '', active: true }

const MedicalSpecialties = () => {
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setSpecialties(await getSpecialties()) }
    catch { toast.error('حدث خطأ أثناء تحميل التخصصات') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = search.trim()
    ? specialties.filter((s) => s.name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()))
    : specialties

  const openAdd = () => { setForm(EMPTY); setEditTarget(null); setModalOpen(true) }
  const openEdit = (s) => { setForm({ ...EMPTY, ...s }); setEditTarget(s); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null) }

  const handleField = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('اسم التخصص مطلوب'); return }
    setSaving(true)
    try {
      if (editTarget) { await updateSpecialty(editTarget.id, form); toast.success('تم تحديث التخصص') }
      else { await createSpecialty(form); toast.success('تم إضافة التخصص') }
      closeModal(); load()
    } catch { toast.error('حدث خطأ، يرجى المحاولة') }
    finally { setSaving(false) }
  }

  const handleDelete = async (s) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${s.name}"؟`)) return
    try { await deleteSpecialty(s.id); toast.success('تم حذف التخصص'); load() }
    catch { toast.error('حدث خطأ أثناء الحذف') }
  }

  const handleToggle = async (s) => {
    try { await updateSpecialty(s.id, { active: !s.active }); toast.success(s.active ? 'تم إيقاف التخصص' : 'تم تفعيل التخصص'); load() }
    catch { toast.error('حدث خطأ') }
  }

  const activeCount = specialties.filter((s) => s.active !== false).length

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', px: 3, py: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>التخصصات الطبية</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{specialties.length} تخصص إجمالي — {activeCount} مفعل</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField size="small" placeholder="بحث في التخصصات..." value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} sx={{ width: 220 }} />
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={openAdd}>إضافة تخصص</Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'إجمالي التخصصات', value: specialties.length, color: 'secondary' },
          { label: 'تخصصات مفعلة', value: activeCount, color: 'success' },
          { label: 'معطلة', value: specialties.length - activeCount, color: 'warning' },
        ].map((s) => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Card sx={{ bgcolor: `${s.color}.50`, boxShadow: 'none', border: 1, borderColor: `${s.color}.200` }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h4" fontWeight={700} color={`${s.color}.main`}>{s.value}</Typography>
                <Typography variant="body2" fontWeight={500} color={`${s.color}.dark`}>{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading ? <Spinner size="lg" /> : filtered.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <MedicalServicesIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">{search ? 'لا توجد نتائج للبحث' : 'لا يوجد تخصصات بعد'}</Typography>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>التخصص</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>الوصف</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={s.imageUrl} sx={{ bgcolor: 'secondary.100', width: 36, height: 36 }}>
                          <MedicalServicesIcon fontSize="small" color="secondary" />
                        </Avatar>
                        <Typography fontWeight={600}>{s.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, maxWidth: 200 }}>
                      <Typography noWrap variant="body2" color="text.secondary">{s.description || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={s.active !== false ? 'مفعل' : 'معطل'} size="small" color={s.active !== false ? 'success' : 'warning'} onClick={() => handleToggle(s)} sx={{ cursor: 'pointer' }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" color="secondary" onClick={() => openEdit(s)}>تعديل</Button>
                        <Button size="small" color="error" onClick={() => handleDelete(s)}>حذف</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editTarget ? 'تعديل التخصص' : 'إضافة تخصص جديد'} size="md">
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField label="اسم التخصص *" name="name" value={form.name} onChange={handleField} required fullWidth />
          <TextField label="الوصف" name="description" value={form.description} onChange={handleField} fullWidth multiline rows={2} />
          <TextField label="رابط أيقونة/صورة" name="imageUrl" value={form.imageUrl} onChange={handleField} fullWidth inputProps={{ dir: 'ltr' }} placeholder="https://..." />
          <FormControlLabel control={<Switch name="active" checked={form.active} onChange={handleField} />} label="التخصص مفعل" />
          <DialogActions sx={{ px: 0, pb: 0 }}>
            <Button onClick={closeModal} variant="outlined" color="inherit">إلغاء</Button>
            <Button type="submit" variant="contained" color="secondary" disabled={saving}>
              {saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة التخصص'}
            </Button>
          </DialogActions>
        </Box>
      </Modal>
    </Box>
  )
}

export default MedicalSpecialties

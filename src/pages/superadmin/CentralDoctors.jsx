import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import DialogActions from '@mui/material/DialogActions'
import SearchIcon from '@mui/icons-material/Search'
import PersonIcon from '@mui/icons-material/Person'
import AddIcon from '@mui/icons-material/Add'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import { getCentralDoctors, createCentralDoctor, updateCentralDoctor, deleteCentralDoctor } from '../../services/doctorService'
import { getSpecialties } from '../../services/specialtyService'
import toast from 'react-hot-toast'

const EMPTY = { name: '', specialization: '', phoneNumber: '' }

const CentralDoctors = () => {
  const [doctors, setDoctors] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const [docsData, specsData] = await Promise.all([getCentralDoctors(), getSpecialties()])
    setDoctors(docsData); setSpecialties(specsData); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const getSpecialtyName = (id) => specialties.find((s) => String(s.id) === String(id))?.name || id

  const filtered = search.trim()
    ? doctors.filter((d) =>
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        getSpecialtyName(d.specialization)?.toLowerCase().includes(search.toLowerCase())
      )
    : doctors

  const openAdd = () => { setForm(EMPTY); setEditTarget(null); setModalOpen(true) }
  const openEdit = (d) => { setForm({ ...EMPTY, ...d }); setEditTarget(d); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null) }

  const handleField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('اسم الطبيب مطلوب'); return }
    setSaving(true)
    try {
      if (editTarget) { await updateCentralDoctor(editTarget.id, form); toast.success('تم تحديث بيانات الطبيب') }
      else { await createCentralDoctor(form); toast.success('تم إضافة الطبيب') }
      closeModal(); load()
    } catch { toast.error('حدث خطأ، يرجى المحاولة') }
    finally { setSaving(false) }
  }

  const handleDelete = async (d) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${d.name}"؟`)) return
    try { await deleteCentralDoctor(d.id); toast.success('تم حذف الطبيب'); load() }
    catch { toast.error('حدث خطأ أثناء الحذف') }
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>الأطباء المركزيون</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{doctors.length} طبيب إجمالي</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField size="small" placeholder="بحث بالاسم أو التخصص..." value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} sx={{ width: 230 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>إضافة طبيب</Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'primary.50', boxShadow: 'none', border: 1, borderColor: 'primary.200' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h4" fontWeight={700} color="primary.main">{doctors.length}</Typography>
              <Typography variant="body2" fontWeight={500} color="primary.dark">إجمالي الأطباء المركزين</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? <Spinner size="lg" /> : filtered.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <PersonIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">{search ? 'لا توجد نتائج' : 'لا يوجد أطباء بعد'}</Typography>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الطبيب</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>التخصص</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>رقم الهاتف</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'primary.100', width: 36, height: 36 }}><PersonIcon fontSize="small" color="primary" /></Avatar>
                        <Typography fontWeight={600}>{d.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">{getSpecialtyName(d.specialization) || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }} dir="ltr">
                      <Typography variant="body2">{d.phoneNumber || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => openEdit(d)}>تعديل</Button>
                        <Button size="small" color="error" onClick={() => handleDelete(d)}>حذف</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editTarget ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'} size="md">
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="اسم الطبيب *" name="name" value={form.name} onChange={handleField} required fullWidth placeholder="د. محمد أحمد" />
            </Grid>
            <Grid item xs={12} sm={6}>
              {specialties.length > 0 ? (
                <TextField select label="التخصص" name="specialization" value={form.specialization} onChange={handleField} fullWidth>
                  <MenuItem value="">اختر التخصص...</MenuItem>
                  {specialties.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </TextField>
              ) : (
                <TextField label="التخصص" name="specialization" value={form.specialization} onChange={handleField} fullWidth placeholder="طب عام، قلب..." />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="رقم الهاتف" name="phoneNumber" value={form.phoneNumber} onChange={handleField} fullWidth inputProps={{ dir: 'ltr' }} />
            </Grid>
          </Grid>
          <DialogActions sx={{ px: 0, pb: 0 }}>
            <Button onClick={closeModal} variant="outlined" color="inherit">إلغاء</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة الطبيب'}
            </Button>
          </DialogActions>
        </Box>
      </Modal>
    </Box>
  )
}

export default CentralDoctors

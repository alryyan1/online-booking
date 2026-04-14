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
import ShieldIcon from '@mui/icons-material/Shield'
import AddIcon from '@mui/icons-material/Add'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import {
  getInsuranceCompanies,
  createInsuranceCompany,
  updateInsuranceCompany,
  deleteInsuranceCompany,
} from '../../services/insuranceService'
import toast from 'react-hot-toast'

const EMPTY = { name: '', description: '', phone: '', enabled: true }

const InsuranceCompanies = () => {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setCompanies(await getInsuranceCompanies()) }
    catch { toast.error('حدث خطأ أثناء تحميل شركات التأمين') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = search.trim()
    ? companies.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : companies

  const openAdd = () => { setForm(EMPTY); setEditTarget(null); setModalOpen(true) }
  const openEdit = (c) => { setForm({ ...EMPTY, ...c }); setEditTarget(c); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null) }

  const handleField = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('اسم الشركة مطلوب'); return }
    setSaving(true)
    try {
      if (editTarget) { await updateInsuranceCompany(editTarget.id, form); toast.success('تم تحديث الشركة') }
      else { await createInsuranceCompany(form); toast.success('تم إضافة الشركة') }
      closeModal(); load()
    } catch { toast.error('حدث خطأ، يرجى المحاولة') }
    finally { setSaving(false) }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${c.name}"؟`)) return
    try { await deleteInsuranceCompany(c.id); toast.success('تم حذف الشركة'); load() }
    catch { toast.error('حدث خطأ أثناء الحذف') }
  }

  const handleToggle = async (c) => {
    try { await updateInsuranceCompany(c.id, { enabled: !c.enabled }); toast.success(c.enabled ? 'تم إيقاف الشركة' : 'تم تفعيل الشركة'); load() }
    catch { toast.error('حدث خطأ') }
  }

  const enabledCount = companies.filter((c) => c.enabled !== false).length

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', px: 3, py: 5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>شركات التأمين</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {companies.length} شركة إجمالي — {enabledCount} مفعلة
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            size="small" placeholder="بحث في الشركات..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ width: 220 }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>إضافة شركة</Button>
        </Stack>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'إجمالي الشركات', value: companies.length, color: 'primary' },
          { label: 'شركات مفعلة', value: enabledCount, color: 'success' },
          { label: 'معطلة', value: companies.length - enabledCount, color: 'warning' },
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

      {/* Table */}
      {loading ? <Spinner size="lg" /> : filtered.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <ShieldIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">{search ? 'لا توجد نتائج للبحث' : 'لا توجد شركات تأمين بعد'}</Typography>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الشركة</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>الهاتف</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>الوصف</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'primary.100', width: 36, height: 36 }}><ShieldIcon fontSize="small" color="primary" /></Avatar>
                        <Typography fontWeight={600}>{c.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }} dir="ltr">{c.phone || '—'}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, maxWidth: 200 }}>
                      <Typography noWrap variant="body2" color="text.secondary">{c.description || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.enabled !== false ? 'مفعل' : 'معطل'}
                        size="small"
                        color={c.enabled !== false ? 'success' : 'warning'}
                        onClick={() => handleToggle(c)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => openEdit(c)}>تعديل</Button>
                        <Button size="small" color="error" onClick={() => handleDelete(c)}>حذف</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editTarget ? 'تعديل شركة التأمين' : 'إضافة شركة تأمين'} size="md">
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField label="اسم الشركة *" name="name" value={form.name} onChange={handleField} required fullWidth />
          <TextField label="رقم الهاتف" name="phone" value={form.phone} onChange={handleField} fullWidth inputProps={{ dir: 'ltr' }} />
          <TextField label="الوصف" name="description" value={form.description} onChange={handleField} fullWidth multiline rows={3} />
          <FormControlLabel
            control={<Switch name="enabled" checked={form.enabled} onChange={handleField} />}
            label="الشركة مفعلة"
          />
          <DialogActions sx={{ px: 0, pb: 0 }}>
            <Button onClick={closeModal} variant="outlined" color="inherit">إلغاء</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة الشركة'}
            </Button>
          </DialogActions>
        </Box>
      </Modal>
    </Box>
  )
}

export default InsuranceCompanies

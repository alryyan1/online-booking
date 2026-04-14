import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Avatar from '@mui/material/Avatar'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import PeopleIcon from '@mui/icons-material/People'
import RefreshIcon from '@mui/icons-material/Refresh'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PersonIcon from '@mui/icons-material/Person'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const ADMIN_API = 'http://localhost:3001'

const ROLES = [
  { value: 'superadmin',  label: 'مشرف عام',   color: 'error' },
  { value: 'admin',       label: 'مشرف مرفق',  color: 'warning' },
  { value: 'doctor',      label: 'طبيب',        color: 'primary' },
  { value: 'callcenter',  label: 'كول سنتر',   color: 'secondary' },
  { value: 'reception',   label: 'استقبال',     color: 'info' },
]

const getRoleMeta = (claims) => {
  const role = claims?.role || 'patient'
  return ROLES.find((r) => r.value === role) || { value: role, label: role, color: 'default' }
}

const SystemUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  // Edit dialog
  const [editUser, setEditUser] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [editDisabled, setEditDisabled] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${ADMIN_API}/auth-users`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setUsers(data.users)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const openEdit = (u) => {
    setEditUser(u)
    setEditRole(u.customClaims?.role || 'patient')
    setEditDisabled(u.disabled)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${ADMIN_API}/auth-users/${editUser.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, disabled: editDisabled }),
      })
      if (!res.ok) throw new Error('فشل التحديث')
      const updated = await res.json()
      setUsers((prev) => prev.map((u) => u.uid === updated.uid
        ? { ...u, disabled: updated.disabled, customClaims: updated.customClaims }
        : u
      ))
      toast.success('تم تحديث المستخدم')
      setEditUser(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      (u.email || '').toLowerCase().includes(s) ||
      (u.displayName || '').toLowerCase().includes(s) ||
      (u.phoneNumber || '').includes(s) ||
      u.uid.toLowerCase().includes(s)
    )
  })

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>مستخدمو Firebase Auth</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            إدارة الحسابات والأدوار لجميع مستخدمي النظام.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchUsers} disabled={loading}>تحديث</Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={fetchUsers}>إعادة المحاولة</Button>}>
          <strong>تعذّر الاتصال بالخادم المحلي.</strong> شغّل{' '}
          <Box component="code" sx={{ bgcolor: 'error.50', px: 0.5, borderRadius: 0.5, fontFamily: 'monospace' }}>npm run admin-api</Box>{' '}
          في طرفية منفصلة.
        </Alert>
      )}

      {!error && (
        <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              إجمالي: <Box component="span" fontWeight={700} color="text.primary">{users.length}</Box>
              {search && ` · نتائج: ${filtered.length}`}
            </Typography>
            <TextField size="small" placeholder="ابحث بالإيميل أو الاسم أو UID..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
              }}
              sx={{ minWidth: 280 }}
            />
          </Stack>
        </Card>
      )}

      {loading ? <Spinner size="lg" /> : error ? null : filtered.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 10 }}>
          <PeopleIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">لا توجد نتائج</Typography>
          {search && <Button size="small" onClick={() => setSearch('')} sx={{ mt: 1 }}>عرض الكل</Button>}
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>المستخدم</TableCell>
                  <TableCell align="center">الدور</TableCell>
                  <TableCell align="center">التحقق</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>مزود الدخول</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>تاريخ الإنشاء</TableCell>
                  <TableCell align="center">تعديل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((u) => {
                  const meta = getRoleMeta(u.customClaims)
                  return (
                    <TableRow key={u.uid} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar src={u.photoURL} sx={{ width: 38, height: 38, bgcolor: 'primary.50' }}>
                            <PersonIcon color="primary" fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600}>{u.displayName || '—'}</Typography>
                            <Typography variant="caption" color="text.secondary" dir="ltr">{u.email || u.phoneNumber || '—'}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        {u.emailVerified
                          ? <CheckCircleIcon color="success" fontSize="small" />
                          : <CancelIcon color="disabled" fontSize="small" />}
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={u.disabled ? 'معطل' : 'نشط'} color={u.disabled ? 'error' : 'success'} variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {u.providers.map((p) => <Chip key={p} size="small" label={p} variant="outlined" sx={{ mr: 0.5 }} />)}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        <Typography variant="caption" color="text.secondary">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={() => openEdit(u)}><EditIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar src={editUser?.photoURL} sx={{ width: 40, height: 40, bgcolor: 'primary.50' }}>
              <PersonIcon color="primary" fontSize="small" />
            </Avatar>
            <Box>
              <Typography fontWeight={700}>{editUser?.displayName || '—'}</Typography>
              <Typography variant="caption" color="text.secondary" dir="ltr">{editUser?.email || '—'}</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField select label="الدور" value={editRole} onChange={(e) => setEditRole(e.target.value)} fullWidth size="small">
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={r.label} color={r.color} variant="outlined" sx={{ pointerEvents: 'none' }} />
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={<Switch checked={editDisabled} onChange={(e) => setEditDisabled(e.target.checked)} color="error" />}
              label={<Typography variant="body2">{editDisabled ? 'الحساب معطل' : 'الحساب نشط'}</Typography>}
            />
            <Alert severity="info" sx={{ fontSize: 12 }}>
              الدور يُحفظ كـ <strong>Custom Claim</strong> في Firebase Auth.
              سيُطبَّق عند تسجيل دخول المستخدم في المرة القادمة.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)} variant="outlined" color="inherit">إلغاء</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SystemUsers

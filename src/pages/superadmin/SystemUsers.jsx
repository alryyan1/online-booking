import { useEffect, useState } from 'react'
import { db } from '../../services/firebase'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { getAllFacilities } from '../../services/facilityService'
import { COLLECTIONS } from '../../utils/constants'
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
import DeleteIcon from '@mui/icons-material/Delete'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PersonIcon from '@mui/icons-material/Person'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const ADMIN_API = 'https://us-central1-hospitalapp-681f1.cloudfunctions.net/api'

const ROLES = [
  { value: 'superadmin',  label: 'مشرف عام',   color: 'error' },
  { value: 'admin',       label: 'مشرف مرفق',  color: 'warning' },
  { value: 'doctor',      label: 'طبيب',        color: 'primary' },
  { value: 'callcenter',  label: 'كول سنتر',   color: 'secondary' },
  { value: 'reception',   label: 'استقبال',     color: 'info' },
]

const getRoleMeta = (claims) => {
  const role = claims?.role
  if (!role) return { value: '', label: 'بدون دور', color: 'default' }
  return ROLES.find((r) => r.value === role) || { value: role, label: role, color: 'default' }
}

const SystemUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [facilities, setFacilities] = useState([])
  const [userFacilityMap, setUserFacilityMap] = useState({}) // uid → facilityId

  // Delete confirm
  const [deleteUser, setDeleteUser] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('callcenter')
  const [newFacilityId, setNewFacilityId] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit dialog
  const [editUser, setEditUser] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [editDisabled, setEditDisabled] = useState(false)
  const [editFacilityId, setEditFacilityId] = useState('')
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

  useEffect(() => {
    fetchUsers()
    getAllFacilities().then(setFacilities).catch(console.error)
  }, [])

  // After users load, fetch their facilityIds from Firestore in bulk
  useEffect(() => {
    if (!users.length) return
    Promise.all(
      users.map(async (u) => {
        try {
          const snap = await getDoc(doc(db, COLLECTIONS.USERS, u.uid))
          return [u.uid, snap.exists() ? (snap.data().facilityId || null) : null]
        } catch { return [u.uid, null] }
      })
    ).then((entries) => setUserFacilityMap(Object.fromEntries(entries)))
  }, [users])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`${ADMIN_API}/auth-users/${deleteUser.uid}`, { method: 'DELETE' })
        .then((r) => { if (!r.ok) throw new Error('فشل حذف الحساب') })
      await deleteDoc(doc(db, COLLECTIONS.USERS, deleteUser.uid)).catch(() => {})
      setUsers((prev) => prev.filter((u) => u.uid !== deleteUser.uid))
      toast.success('تم حذف المستخدم بنجاح')
      setDeleteUser(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleCreate = async () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      toast.error('البريد الإلكتروني وكلمة المرور مطلوبان')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`${ADMIN_API}/auth-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          displayName: newName.trim() || undefined,
          role: newRole,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'فشل إنشاء المستخدم')
      }
      const created = await res.json()

      // Save facilityId to Firestore
      if (created.uid) {
        const selectedFacility = facilities.find((f) => f.id === newFacilityId)
        await setDoc(doc(db, COLLECTIONS.USERS, created.uid), {
          facilityId: newFacilityId || null,
          facilityName: selectedFacility?.name || null,
          role: newRole,
          email: newEmail.trim(),
          displayName: newName.trim() || null,
        }, { merge: true })
      }

      toast.success('تم إنشاء المستخدم بنجاح')
      setCreateOpen(false)
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('callcenter'); setNewFacilityId('')
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const openEdit = async (u) => {
    setEditUser(u)
    setEditRole(u.customClaims?.role || 'patient')
    setEditDisabled(u.disabled)
    setEditFacilityId('')
    // Load current facilityId from Firestore
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.USERS, u.uid))
      if (snap.exists()) setEditFacilityId(snap.data().facilityId || '')
    } catch { /* ignore */ }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Update Auth claims + disabled via admin API
      const res = await fetch(`${ADMIN_API}/auth-users/${editUser.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, disabled: editDisabled }),
      })
      if (!res.ok) throw new Error('فشل التحديث')
      const updated = await res.json()

      // 2. Save facilityId to Firestore users collection
      const selectedFacility = facilities.find((f) => f.id === editFacilityId)
      await setDoc(
        doc(db, COLLECTIONS.USERS, editUser.uid),
        {
          facilityId: editFacilityId || null,
          facilityName: selectedFacility?.name || null,
          role: editRole,
          email: editUser.email || null,
          displayName: editUser.displayName || null,
        },
        { merge: true }
      )

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
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchUsers} disabled={loading}>تحديث</Button>
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setCreateOpen(true)}>مستخدم جديد</Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={fetchUsers}>إعادة المحاولة</Button>}>
          <strong>تعذّر الاتصال بالخادم.</strong> {error}
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
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>المنشأة</TableCell>
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
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {(() => {
                          const fid = userFacilityMap[u.uid]
                          const facility = fid ? facilities.find((f) => f.id === fid) : null
                          return facility
                            ? <Chip size="small" label={facility.name} variant="outlined" color="primary" />
                            : <Typography variant="caption" color="text.disabled">—</Typography>
                        })()}
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
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <IconButton size="small" color="primary" onClick={() => openEdit(u)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteUser(u)}><DeleteIcon fontSize="small" /></IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteUser} onClose={() => setDeleteUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'error.50' }}>
              <DeleteIcon color="error" fontSize="small" />
            </Avatar>
            <Box>
              <Typography fontWeight={700}>حذف المستخدم</Typography>
              <Typography variant="caption" color="text.secondary">هذا الإجراء لا يمكن التراجع عنه</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            سيتم حذف الحساب نهائياً من Firebase Auth وقاعدة البيانات.
          </Alert>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar src={deleteUser?.photoURL} sx={{ width: 36, height: 36, bgcolor: 'grey.100' }}>
              <PersonIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography fontWeight={600}>{deleteUser?.displayName || '—'}</Typography>
              <Typography variant="caption" color="text.secondary" dir="ltr">{deleteUser?.email || '—'}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUser(null)} variant="outlined" color="inherit" disabled={deleting}>إلغاء</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={deleting} startIcon={<DeleteIcon />}>
            {deleting ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.50' }}>
              <PersonAddIcon color="primary" fontSize="small" />
            </Avatar>
            <Typography fontWeight={700}>إنشاء مستخدم جديد</Typography>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="الاسم"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth size="small"
              placeholder="اسم المستخدم"
            />
            <TextField
              label="البريد الإلكتروني"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              fullWidth size="small" required
              type="email" dir="ltr"
              placeholder="example@email.com"
            />
            <TextField
              label="كلمة المرور"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth size="small" required
              type="password"
              placeholder="6 أحرف على الأقل"
            />
            <TextField select label="الدور" value={newRole} onChange={(e) => setNewRole(e.target.value)} fullWidth size="small">
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  <Chip size="small" label={r.label} color={r.color} variant="outlined" sx={{ pointerEvents: 'none' }} />
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="المنشأة المرتبطة"
              value={newFacilityId}
              onChange={(e) => setNewFacilityId(e.target.value)}
              fullWidth size="small"
              helperText="اختياري"
            >
              <MenuItem value=""><em>بدون منشأة</em></MenuItem>
              {facilities.map((f) => (
                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} variant="outlined" color="inherit">إلغاء</Button>
          <Button onClick={handleCreate} variant="contained" disabled={creating} startIcon={<PersonAddIcon />}>
            {creating ? 'جاري الإنشاء...' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

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

            <TextField
              select
              label="المنشأة المرتبطة"
              value={editFacilityId}
              onChange={(e) => setEditFacilityId(e.target.value)}
              fullWidth
              size="small"
              helperText="اختر المنشأة التي ينتمي إليها هذا المستخدم"
            >
              <MenuItem value=""><em>بدون منشأة</em></MenuItem>
              {facilities.map((f) => (
                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
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

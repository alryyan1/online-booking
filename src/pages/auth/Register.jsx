import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import { useAuth } from '../../contexts/AuthContext'
import { getAllFacilities } from '../../services/facilityService'
import toast from 'react-hot-toast'

const ROLE_OPTIONS = [
  { value: 'admin',      label: 'مشرف' },
  { value: 'callcenter', label: 'كول سنتر' },
  { value: 'reception',  label: 'استقبال' },
  { value: 'doctor',     label: 'طبيب' },
]

const ROLES_NEEDING_FACILITY = ['admin', 'callcenter', 'reception', 'doctor']

const Register = () => {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirm: '', role: 'admin', facilityId: '' })
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAllFacilities().then(setFacilities).catch(() => {})
  }, [])

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const needsFacility = ROLES_NEEDING_FACILITY.includes(form.role)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.displayName || !form.email || !form.password || !form.confirm) {
      toast.error('يرجى ملء جميع الحقول'); return
    }
    if (needsFacility && !form.facilityId) {
      toast.error('يرجى اختيار المرفق'); return
    }
    if (form.password !== form.confirm) { toast.error('كلمتا المرور غير متطابقتين'); return }
    if (form.password.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    setLoading(true)
    try {
      await register(form.email, form.password, form.displayName, form.role, needsFacility ? form.facilityId : null)
      toast.success('تم إنشاء الحساب بنجاح')
      navigate('/login')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error('هذا البريد الإلكتروني مستخدم بالفعل')
      } else {
        toast.error('حدث خطأ، يرجى المحاولة مرة أخرى')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, background: 'linear-gradient(135deg, #e3f2fd 0%, #e8eaf6 100%)' }}>
      <Card sx={{ width: '100%', maxWidth: 440, borderRadius: 3 }} elevation={4}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <AssignmentIndIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>إنشاء حساب جديد</Typography>
            <Typography variant="body2" color="text.secondary">انضم إلى منظومة الحجز الطبي</Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="الاسم الكامل" name="displayName" value={form.displayName} onChange={handleChange} placeholder="أحمد محمد" fullWidth />
            <TextField label="البريد الإلكتروني" name="email" type="email" value={form.email} onChange={handleChange} fullWidth inputProps={{ dir: 'ltr' }} />
            <TextField label="كلمة المرور" name="password" type="password" value={form.password} onChange={handleChange} placeholder="6 أحرف على الأقل" fullWidth inputProps={{ dir: 'ltr' }} />
            <TextField label="تأكيد كلمة المرور" name="confirm" type="password" value={form.confirm} onChange={handleChange} fullWidth inputProps={{ dir: 'ltr' }} />
            <TextField select label="الدور" name="role" value={form.role} onChange={handleChange} fullWidth>
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>
            {needsFacility && (
              <TextField select label="المرفق" name="facilityId" value={form.facilityId} onChange={handleChange} fullWidth>
                {facilities.map((f) => (
                  <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                ))}
              </TextField>
            )}
            <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ py: 1.5 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'إنشاء الحساب'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 3 }}>
            لديك حساب بالفعل؟{' '}
            <Typography component={Link} to="/login" variant="body2" color="primary" sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              تسجيل الدخول
            </Typography>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Register

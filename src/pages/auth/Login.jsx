import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import { useAuth } from '../../contexts/AuthContext'
import { getRedirectPath } from '../../utils/constants'
import toast from 'react-hot-toast'

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('يرجى ملء جميع الحقول'); return }
    setLoading(true)
    try {
      const { role, facilityId } = await login(form.email, form.password)
      toast.success('تم تسجيل الدخول بنجاح')
      navigate(getRedirectPath(role, facilityId), { replace: true })
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      } else if (err.code === 'auth/user-not-found') {
        toast.error('لا يوجد حساب بهذا البريد الإلكتروني')
      } else {
        toast.error('حدث خطأ، يرجى المحاولة مرة أخرى')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', px: 2, background: 'linear-gradient(135deg, #e3f2fd 0%, #e8eaf6 100%)' }}>
      <Card sx={{ width: '100%', maxWidth: 440, borderRadius: 3 }} elevation={4}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <LocalHospitalIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>تسجيل الدخول</Typography>
            <Typography variant="body2" color="text.secondary">مرحباً بك في منظومة الحجز الطبي</Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="البريد الإلكتروني"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@email.com"
              fullWidth
              inputProps={{ dir: 'ltr' }}
              autoComplete="email"
            />
            <TextField
              label="كلمة المرور"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              fullWidth
              inputProps={{ dir: 'ltr' }}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{ py: 1.5, mt: 0.5 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'تسجيل الدخول'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 3 }}>
            ليس لديك حساب؟{' '}
            <Typography component={Link} to="/register" variant="body2" color="primary" sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              إنشاء حساب جديد
            </Typography>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Login

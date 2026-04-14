import { useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const INITIAL = {
  name: '',
  specialization: '',
  bio: '',
  phoneNumber: '',
  imageUrl: '',
  available: true,
  workingDays: [],
}

const DoctorForm = ({ initialData = {}, specializations = [], onSubmit, loading }) => {
  const [form, setForm] = useState({ ...INITIAL, ...initialData })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter((d) => d !== day)
        : [...f.workingDays, day],
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField label="اسم الطبيب *" name="name" value={form.name} onChange={handleChange} required fullWidth placeholder="د. أحمد الشمري" />
        </Grid>
        <Grid item xs={12} sm={6}>
          {specializations.length > 0 ? (
            <TextField select label="التخصص" name="specialization" value={form.specialization} onChange={handleChange} fullWidth>
              <MenuItem value="">اختر التخصص</MenuItem>
              {specializations.map((s) => <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>)}
            </TextField>
          ) : (
            <TextField label="التخصص" name="specialization" value={form.specialization} onChange={handleChange} fullWidth placeholder="طب عام، قلب، عظام..." />
          )}
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="رقم الهاتف" name="phoneNumber" type="tel" value={form.phoneNumber} onChange={handleChange} fullWidth inputProps={{ dir: 'ltr' }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="رابط الصورة (اختياري)" name="imageUrl" type="url" value={form.imageUrl} onChange={handleChange} fullWidth inputProps={{ dir: 'ltr' }} placeholder="https://..." />
        </Grid>
        <Grid item xs={12}>
          <TextField label="نبذة عن الطبيب" name="bio" value={form.bio} onChange={handleChange} fullWidth multiline rows={2} placeholder="خبرات ومؤهلات الطبيب..." />
        </Grid>
      </Grid>

      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>أيام العمل</Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {DAYS.map((day) => (
            <Chip
              key={day}
              label={day}
              onClick={() => toggleDay(day)}
              color={form.workingDays.includes(day) ? 'primary' : 'default'}
              variant={form.workingDays.includes(day) ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Stack>
      </Box>

      <FormControlLabel control={<Switch name="available" checked={form.available} onChange={handleChange} />} label="الطبيب متاح للحجز" />

      <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
        {loading ? 'جاري الحفظ...' : initialData.id ? 'حفظ التعديلات' : 'إضافة الطبيب'}
      </Button>
    </Box>
  )
}

export default DoctorForm

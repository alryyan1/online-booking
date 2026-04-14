import { useEffect, useState } from 'react'
import { getCentralDoctors, createCentralDoctor, updateCentralDoctor, deleteCentralDoctor } from '../../services/doctorService'
import { getSpecializations } from '../../services/facilityService'
import { useAuth } from '../../contexts/AuthContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import PersonIcon from '@mui/icons-material/Person'
import DoctorForm from '../../components/doctor/DoctorForm'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const DoctorManagement = () => {
  const { facilityId } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [specializations, setSpecializations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const [d, s] = await Promise.all([getCentralDoctors(), facilityId ? getSpecializations(facilityId) : Promise.resolve([])])
    setDoctors(d); setSpecializations(s); setLoading(false)
  }

  useEffect(() => { load() }, [facilityId])

  const filtered = search.trim()
    ? doctors.filter((d) => d.name?.toLowerCase().includes(search.toLowerCase()) || d.specialization?.toString().toLowerCase().includes(search.toLowerCase()))
    : doctors

  const openAdd = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit = (d) => { setEditTarget(d); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null) }

  const handleSubmit = async (data) => {
    setFormLoading(true)
    try {
      if (editTarget) { await updateCentralDoctor(editTarget.id, data); toast.success('تم تحديث بيانات الطبيب') }
      else { await createCentralDoctor(data); toast.success('تم إضافة الطبيب بنجاح') }
      closeModal(); load()
    } catch { toast.error('حدث خطأ، يرجى المحاولة') }
    finally { setFormLoading(false) }
  }

  const handleDelete = async (doctor) => {
    if (!window.confirm(`هل أنت متأكد من حذف الدكتور "${doctor.name}"؟`)) return
    try { await deleteCentralDoctor(doctor.id); toast.success('تم حذف الطبيب'); load() }
    catch { toast.error('حدث خطأ أثناء الحذف') }
  }

  const handleToggle = async (doctor) => {
    try { await updateCentralDoctor(doctor.id, { available: !doctor.available }); toast.success(doctor.available ? 'تم إيقاف الطبيب' : 'تم تفعيل الطبيب'); load() }
    catch { toast.error('حدث خطأ') }
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', px: 3, py: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>إدارة الأطباء</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{doctors.length} طبيب في القاعدة المركزية</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField size="small" placeholder="بحث باسم الطبيب..." value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} sx={{ width: 220 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>إضافة طبيب</Button>
        </Stack>
      </Box>

      {loading ? <Spinner size="lg" /> : filtered.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 10 }}>
          <PersonIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">{search ? 'لا توجد نتائج' : 'لا يوجد أطباء. ابدأ بإضافة طبيب.'}</Typography>
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
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((doctor) => (
                  <TableRow key={doctor.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={doctor.imageUrl} sx={{ width: 36, height: 36, bgcolor: 'primary.100' }}>
                          <PersonIcon fontSize="small" color="primary" />
                        </Avatar>
                        <Typography fontWeight={600}>{doctor.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">{doctor.specialization || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }} dir="ltr">
                      <Typography variant="body2">{doctor.phoneNumber || doctor.phone || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={doctor.available !== false ? 'متاح' : 'غير متاح'}
                        size="small"
                        color={doctor.available !== false ? 'success' : 'error'}
                        onClick={() => handleToggle(doctor)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => openEdit(doctor)}>تعديل</Button>
                        <Button size="small" color="error" onClick={() => handleDelete(doctor)}>حذف</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editTarget ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'} size="lg">
        <DoctorForm initialData={editTarget || {}} specializations={specializations} onSubmit={handleSubmit} loading={formLoading} />
      </Modal>
    </Box>
  )
}

export default DoctorManagement

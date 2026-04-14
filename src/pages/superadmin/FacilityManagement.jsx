import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import { getAllFacilities, createFacility, updateFacility, deleteFacility } from '../../services/facilityService'
import FacilityForm from '../../components/facility/FacilityForm'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const FacilityManagement = () => {
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  const dragIndex = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const load = async () => {
    setLoading(true)
    setFacilities(await getAllFacilities())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit = (f) => { setEditTarget(f); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null) }

  const handleSubmit = async (data) => {
    setFormLoading(true)
    try {
      if (editTarget) {
        const payload = { ...data }
        if (!payload.adminPassword) delete payload.adminPassword
        await updateFacility(editTarget.id, payload)
        toast.success('تم تحديث المرفق بنجاح')
      } else {
        await createFacility(data)
        toast.success('تم إضافة المرفق بنجاح')
      }
      closeModal(); load()
    } catch (err) { toast.error('حدث خطأ: ' + (err.message || 'يرجى المحاولة')) }
    finally { setFormLoading(false) }
  }

  const handleDelete = async (f) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${f.name}"؟`)) return
    try { await deleteFacility(f.id); toast.success('تم حذف المرفق'); load() }
    catch { toast.error('حدث خطأ أثناء الحذف') }
  }

  const handleToggle = async (f) => {
    try { await updateFacility(f.id, { available: !f.available }); toast.success(f.available ? 'تم إيقاف المرفق' : 'تم تفعيل المرفق'); load() }
    catch { toast.error('حدث خطأ') }
  }

  // Drag & drop
  const handleDragStart = (i) => { dragIndex.current = i }
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOverIndex(i) }
  const handleDrop = async (e, dropIndex) => {
    e.preventDefault()
    const fromIndex = dragIndex.current
    if (fromIndex === null || fromIndex === dropIndex) { dragIndex.current = null; setDragOverIndex(null); return }
    const reordered = [...facilities]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(dropIndex, 0, moved)
    const updated = reordered.map((f, i) => ({ ...f, order: i + 1 }))
    setFacilities(updated); dragIndex.current = null; setDragOverIndex(null)
    setSavingOrder(true)
    try {
      await Promise.all(updated.filter((f, i) => f.order !== facilities[i]?.order).map((f) => updateFacility(f.id, { order: f.order })))
    } catch { toast.error('حدث خطأ أثناء حفظ الترتيب'); load() }
    finally { setSavingOrder(false) }
  }
  const handleDragEnd = () => { dragIndex.current = null; setDragOverIndex(null) }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>إدارة المرافق الصحية</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {facilities.length} مرفق مسجل
            {savingOrder && <Box component="span" sx={{ color: 'primary.main', mr: 1 }}> • جاري حفظ الترتيب...</Box>}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>إضافة مرفق</Button>
      </Box>

      {loading ? <Spinner size="lg" /> : facilities.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 10 }}>
          <LocalHospitalIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">لا توجد مرافق بعد. ابدأ بإضافة مرفق جديد.</Typography>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell>المرفق</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>العنوان</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>الهاتف</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {facilities.map((f, index) => (
                  <TableRow
                    key={f.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    hover
                    sx={{
                      opacity: dragIndex.current === index ? 0.4 : 1,
                      borderTop: dragOverIndex === index && dragIndex.current !== index ? '2px solid' : undefined,
                      borderTopColor: 'primary.main',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <TableCell sx={{ pl: 1, pr: 0 }}>
                      <Tooltip title="اسحب لإعادة الترتيب">
                        <DragIndicatorIcon sx={{ color: 'grey.400', cursor: 'grab', '&:hover': { color: 'grey.600' } }} />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={f.imageUrl} sx={{ bgcolor: 'primary.100', width: 40, height: 40 }}>
                          <LocalHospitalIcon fontSize="small" color="primary" />
                        </Avatar>
                        <Typography fontWeight={600}>{f.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">{f.address || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }} dir="ltr">
                      <Typography variant="body2">{f.phone || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={f.available ? 'نشط' : 'معطل'}
                        size="small"
                        color={f.available ? 'success' : 'error'}
                        onClick={() => handleToggle(f)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => openEdit(f)}>تعديل</Button>
                        <Button size="small" color="error" onClick={() => handleDelete(f)}>حذف</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editTarget ? 'تعديل بيانات المرفق' : 'إضافة مرفق جديد'} size="lg">
        <FacilityForm initialData={editTarget || {}} onSubmit={handleSubmit} loading={formLoading} />
      </Modal>
    </Box>
  )
}

export default FacilityManagement

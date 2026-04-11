import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAllFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
} from '../../services/facilityService'
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

  // Drag state
  const dragIndex = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const load = async () => {
    setLoading(true)
    const data = await getAllFacilities()
    setFacilities(data)
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
      closeModal()
      load()
    } catch (err) {
      toast.error('حدث خطأ: ' + (err.message || 'يرجى المحاولة'))
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (facility) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${facility.name}"؟`)) return
    try {
      await deleteFacility(facility.id)
      toast.success('تم حذف المرفق')
      load()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const handleToggle = async (facility) => {
    try {
      await updateFacility(facility.id, { available: !facility.available })
      toast.success(facility.available ? 'تم إيقاف المرفق' : 'تم تفعيل المرفق')
      load()
    } catch {
      toast.error('حدث خطأ')
    }
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  const handleDragStart = (index) => {
    dragIndex.current = index
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault()
    const fromIndex = dragIndex.current
    if (fromIndex === null || fromIndex === dropIndex) {
      dragIndex.current = null
      setDragOverIndex(null)
      return
    }

    // Reorder array
    const reordered = [...facilities]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(dropIndex, 0, moved)

    // Assign new order values (1-based)
    const updated = reordered.map((f, i) => ({ ...f, order: i + 1 }))
    setFacilities(updated)
    dragIndex.current = null
    setDragOverIndex(null)

    // Persist to Firestore — only update items whose order changed
    setSavingOrder(true)
    try {
      await Promise.all(
        updated
          .filter((f, i) => f.order !== facilities[i]?.order)
          .map((f) => updateFacility(f.id, { order: f.order }))
      )
    } catch {
      toast.error('حدث خطأ أثناء حفظ الترتيب')
      load() // revert on failure
    } finally {
      setSavingOrder(false)
    }
  }

  const handleDragEnd = () => {
    dragIndex.current = null
    setDragOverIndex(null)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة المرافق الصحية</h1>
          <p className="text-gray-500 text-sm mt-1">
            {facilities.length} مرفق مسجل
            {savingOrder && <span className="mr-2 text-blue-500">• جاري حفظ الترتيب...</span>}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
        >
          + إضافة مرفق
        </button>
      </div>

      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : facilities.length === 0 ? (
        <div className="text-center text-gray-400 py-20 bg-white rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">🏥</div>
          <p>لا توجد مرافق بعد. ابدأ بإضافة مرفق جديد.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-right">
              <tr>
                <th className="px-3 py-3 w-8"></th>
                <th className="px-5 py-3 font-medium">المرفق</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">العنوان</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">الهاتف</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facilities.map((f, index) => (
                <tr
                  key={f.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`transition-colors
                    ${dragOverIndex === index && dragIndex.current !== index
                      ? 'bg-blue-50 border-t-2 border-blue-400'
                      : 'hover:bg-gray-50'}
                    ${dragIndex.current === index ? 'opacity-50' : ''}`}
                >
                  {/* Drag handle */}
                  <td className="px-3 py-4 text-center">
                    <span className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing select-none text-lg leading-none">
                      ⠿
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                        {f.imageUrl ? (
                          <img src={f.imageUrl} alt={f.name} className="w-full h-full object-cover" />
                        ) : '🏥'}
                      </div>
                      <span className="font-medium text-gray-800">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500 hidden md:table-cell">{f.address || '-'}</td>
                  <td className="px-5 py-4 text-gray-500 hidden md:table-cell" dir="ltr">{f.phone || '-'}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggle(f)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition
                        ${f.available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                    >
                      {f.available ? 'نشط' : 'معطل'}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(f)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        className="text-red-500 hover:text-red-700 font-medium text-xs"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'تعديل بيانات المرفق' : 'إضافة مرفق جديد'}
        size="lg"
      >
        <FacilityForm
          initialData={editTarget || {}}
          onSubmit={handleSubmit}
          loading={formLoading}
        />
      </Modal>
    </div>
  )
}

export default FacilityManagement

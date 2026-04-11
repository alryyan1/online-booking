import { useEffect, useState } from 'react'
import {
  getSpecialties,
  createSpecialty,
  updateSpecialty,
  deleteSpecialty,
} from '../../services/specialtyService'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const EMPTY = { name: '', description: '', imageUrl: '', active: true }

const SpecialtyFormFields = ({ form, setForm }) => {
  const handle = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">اسم التخصص *</label>
        <input name="name" value={form.name} onChange={handle} required placeholder="طب عام، جلدية..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
        <textarea name="description" value={form.description} onChange={handle} rows={2} placeholder="وصف التخصص..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">رابط أيقونة/صورة</label>
        <input name="imageUrl" value={form.imageUrl} onChange={handle} dir="ltr" placeholder="https://..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input type="checkbox" name="active" id="active" checked={form.active} onChange={handle} className="w-4 h-4 accent-purple-600" />
        <label htmlFor="active" className="text-sm font-medium text-gray-700">التخصص مفعل</label>
      </div>
    </div>
  )
}

const MedicalSpecialties = () => {
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getSpecialties()
      setSpecialties(data)
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل التخصصات')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = search.trim()
    ? specialties.filter((s) =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase())
      )
    : specialties

  const openAdd = () => { setForm(EMPTY); setEditTarget(null); setModalOpen(true) }
  const openEdit = (s) => { setForm({ ...EMPTY, ...s }); setEditTarget(s); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('اسم التخصص مطلوب'); return }
    setSaving(true)
    try {
      if (editTarget) {
        await updateSpecialty(editTarget.id, form)
        toast.success('تم تحديث التخصص')
      } else {
        await createSpecialty(form)
        toast.success('تم إضافة التخصص بنجاح')
      }
      closeModal()
      load()
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (specialty) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${specialty.name}"؟`)) return
    try {
      await deleteSpecialty(specialty.id)
      toast.success('تم حذف التخصص')
      load()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const handleToggle = async (specialty) => {
    try {
      await updateSpecialty(specialty.id, { active: !specialty.active })
      toast.success(specialty.active ? 'تم إيقاف التخصص' : 'تم تفعيل التخصص')
      load()
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const activeCount = specialties.filter((s) => s.active !== false).length

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التخصصات الطبية</h1>
          <p className="text-gray-500 text-sm mt-1">
            {specialties.length} تخصص إجمالي — {activeCount} مفعل
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="بحث في التخصصات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-52"
          />
          <button
            onClick={openAdd}
            className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition font-medium text-sm whitespace-nowrap"
          >
            + إضافة تخصص
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-purple-50 rounded-2xl p-5">
          <div className="text-3xl mb-1">⚕️</div>
          <div className="text-2xl font-bold text-purple-700">{specialties.length}</div>
          <div className="text-xs text-purple-600 font-medium">إجمالي التخصصات</div>
        </div>
        <div className="bg-teal-50 rounded-2xl p-5">
          <div className="text-3xl mb-1">✨</div>
          <div className="text-2xl font-bold text-teal-700">{activeCount}</div>
          <div className="text-xs text-teal-600 font-medium">تخصصات مفعلة</div>
        </div>
        <div className="bg-orange-50 rounded-2xl p-5">
          <div className="text-3xl mb-1">⏸️</div>
          <div className="text-2xl font-bold text-orange-600">{specialties.length - activeCount}</div>
          <div className="text-xs text-orange-500 font-medium">معطلة</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">⚕️</div>
          <p className="text-lg">{search ? 'لا توجد نتائج للبحث' : 'لا يوجد تخصصات بعد'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-right">
              <tr>
                <th className="px-5 py-3 font-medium">التخصص</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">الوصف</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((specialty) => (
                <tr key={specialty.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                        {specialty.imageUrl
                          ? <img src={specialty.imageUrl} alt={specialty.name} className="w-full h-full object-cover rounded-full" />
                          : '⚕️'}
                      </div>
                      <p className="font-medium text-gray-800">{specialty.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell max-w-[200px] truncate">
                    {specialty.description || '-'}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggle(specialty)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition
                        ${specialty.active !== false
                          ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                          : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
                    >
                      {specialty.active !== false ? 'مفعل' : 'معطل'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(specialty)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">تعديل</button>
                      <button onClick={() => handleDelete(specialty)} className="text-red-500 hover:text-red-700 font-medium text-xs">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editTarget ? 'تعديل التخصص' : 'إضافة تخصص جديد'} size="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <SpecialtyFormFields form={form} setForm={setForm} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition font-medium">
              إلغاء
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50">
              {saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة التخصص'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default MedicalSpecialties

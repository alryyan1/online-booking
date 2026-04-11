import { useEffect, useState } from 'react'
import {
  getCentralDoctors,
  createCentralDoctor,
  updateCentralDoctor,
  deleteCentralDoctor,
} from '../../services/doctorService'
import { getSpecialties } from '../../services/specialtyService'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const EMPTY = { name: '', specialization: '', phoneNumber: '' }

const DoctorFormFields = ({ form, setForm, specialties = [] }) => {
  const handle = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطبيب *</label>
          <input name="name" value={form.name} onChange={handle} required placeholder="د. محمد أحمد"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التخصص</label>
          {specialties.length > 0 ? (
            <select name="specialization" value={form.specialization} onChange={handle}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">اختر التخصص...</option>
              {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <input name="specialization" value={form.specialization} onChange={handle} placeholder="طب عام، قلب، عظام..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
          <input name="phoneNumber" value={form.phoneNumber} onChange={handle} dir="ltr" placeholder="+966 5X XXX XXXX"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
    </div>
  )
}

const CentralDoctors = () => {
  const [doctors, setDoctors] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const [docsData, specsData] = await Promise.all([
      getCentralDoctors(),
      getSpecialties()
    ])
    setDoctors(docsData)
    setSpecialties(specsData)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const getSpecialtyName = (id) => specialties.find(s => String(s.id) === String(id))?.name || id

  const filtered = search.trim()
    ? doctors.filter((d) =>
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        getSpecialtyName(d.specialization)?.toLowerCase().includes(search.toLowerCase())
      )
    : doctors

  const openAdd = () => { setForm(EMPTY); setEditTarget(null); setModalOpen(true) }
  const openEdit = (d) => { setForm({ ...EMPTY, ...d }); setEditTarget(d); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('اسم الطبيب مطلوب'); return }
    setSaving(true)
    try {
      if (editTarget) {
        await updateCentralDoctor(editTarget.id, form)
        toast.success('تم تحديث بيانات الطبيب')
      } else {
        console.log(form,'form')
        await createCentralDoctor(form)
        toast.success('تم إضافة الطبيب بنجاح')
      }
      closeModal()
      load()
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (doctor) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${doctor.name}"؟`)) return
    try {
      await deleteCentralDoctor(doctor.id)
      toast.success('تم حذف الطبيب')
      load()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الأطباء المركزيون</h1>
          <p className="text-gray-500 text-sm mt-1">
            {doctors.length} طبيب إجمالي
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="بحث بالاسم أو التخصص..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
          <button
            onClick={openAdd}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm whitespace-nowrap"
          >
            + إضافة طبيب
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-2xl p-5">
          <div className="text-3xl mb-1">👨‍⚕️</div>
          <div className="text-2xl font-bold text-blue-700">{doctors.length}</div>
          <div className="text-xs text-blue-600 font-medium">إجمالي الأطباء المركزين</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-20 bg-white rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">👨‍⚕️</div>
          <p className="text-lg">{search ? 'لا توجد نتائج للبحث' : 'لا يوجد أطباء بعد'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-right">
              <tr>
                <th className="px-5 py-3 font-medium">الطبيب</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">التخصص</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">رقم الهاتف</th>
                <th className="px-5 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                        👨‍⚕️
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{doctor.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{getSpecialtyName(doctor.specialization) || '-'}</td>
                  <td className="px-5 py-3 text-gray-500 hidden md:table-cell" dir="ltr">{doctor.phoneNumber || '-'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(doctor)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">تعديل</button>
                      <button onClick={() => handleDelete(doctor)} className="text-red-500 hover:text-red-700 font-medium text-xs">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editTarget ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DoctorFormFields form={form} setForm={setForm} specialties={specialties} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition">
              إلغاء
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
              {saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة الطبيب'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CentralDoctors

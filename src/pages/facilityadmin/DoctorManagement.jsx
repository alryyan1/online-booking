import { useEffect, useState } from 'react'
import {
  getCentralDoctors,
  createCentralDoctor,
  updateCentralDoctor,
  deleteCentralDoctor,
} from '../../services/doctorService'
import { getSpecializations } from '../../services/facilityService'
import { useAuth } from '../../contexts/AuthContext'
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
    const [d, s] = await Promise.all([
      getCentralDoctors(),
      facilityId ? getSpecializations(facilityId) : Promise.resolve([]),
    ])
    setDoctors(d)
    setSpecializations(s)
    setLoading(false)
  }

  useEffect(() => { load() }, [facilityId])

  const filtered = search.trim()
    ? doctors.filter(
        (d) =>
          d.name?.toLowerCase().includes(search.toLowerCase()) ||
          d.specialization?.toString().toLowerCase().includes(search.toLowerCase())
      )
    : doctors

  const openAdd = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit = (d) => { setEditTarget(d); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null) }

  const handleSubmit = async (data) => {
    setFormLoading(true)
    try {
      if (editTarget) {
        await updateCentralDoctor(editTarget.id, data)
        toast.success('تم تحديث بيانات الطبيب')
      } else {
        await createCentralDoctor(data)
        toast.success('تم إضافة الطبيب بنجاح')
      }
      closeModal()
      load()
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (doctor) => {
    if (!window.confirm(`هل أنت متأكد من حذف الدكتور "${doctor.name}"؟`)) return
    try {
      await deleteCentralDoctor(doctor.id)
      toast.success('تم حذف الطبيب')
      load()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const handleToggle = async (doctor) => {
    try {
      await updateCentralDoctor(doctor.id, { available: !doctor.available })
      toast.success(doctor.available ? 'تم إيقاف الطبيب' : 'تم تفعيل الطبيب')
      load()
    } catch {
      toast.error('حدث خطأ')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة الأطباء</h1>
          <p className="text-gray-500 text-sm mt-1">{doctors.length} طبيب في القاعدة المركزية</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="بحث باسم الطبيب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
          <button
            onClick={openAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm whitespace-nowrap"
          >
            + إضافة طبيب
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-20 bg-white rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">👨‍⚕️</div>
          <p>لا يوجد أطباء. ابدأ بإضافة طبيب.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-right">
              <tr>
                <th className="px-5 py-3 font-medium">الطبيب</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">التخصص</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">رقم الهاتف</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                        {doctor.imageUrl
                          ? <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover rounded-full" />
                          : '👨‍⚕️'}
                      </div>
                      <span className="font-medium text-gray-800">{doctor.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">
                    {doctor.specialization || '-'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 hidden md:table-cell" dir="ltr">
                    {doctor.phoneNumber || doctor.phone || '-'}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggle(doctor)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition
                        ${doctor.available !== false
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                    >
                      {doctor.available !== false ? 'متاح' : 'غير متاح'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(doctor)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(doctor)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
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
        title={editTarget ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'}
        size="lg"
      >
        <DoctorForm
          initialData={editTarget || {}}
          specializations={specializations}
          onSubmit={handleSubmit}
          loading={formLoading}
        />
      </Modal>
    </div>
  )
}

export default DoctorManagement

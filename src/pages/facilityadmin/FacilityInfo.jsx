import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  getFacilityById,
  updateFacility,
  getSpecializations,
  addSpecialization,
  getInsuranceCompanies,
  addInsuranceCompany,
} from '../../services/facilityService'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const FacilityInfo = () => {
  const { facilityId } = useAuth()
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})

  const [specializations, setSpecializations] = useState([])
  const [newSpec, setNewSpec] = useState('')
  const [insurance, setInsurance] = useState([])
  const [newIns, setNewIns] = useState('')

  const load = async () => {
    const [f, s, i] = await Promise.all([
      getFacilityById(facilityId),
      getSpecializations(facilityId),
      getInsuranceCompanies(facilityId),
    ])
    setFacility(f)
    setForm({ name: f.name, address: f.address || '', phone: f.phone || '' })
    setSpecializations(s)
    setInsurance(i)
    setLoading(false)
  }

  useEffect(() => {
    if (facilityId) load()
  }, [facilityId])

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateFacility(facilityId, form)
      toast.success('تم حفظ معلومات المرفق')
    } catch {
      toast.error('حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSpec = async (e) => {
    e.preventDefault()
    if (!newSpec.trim()) return
    await addSpecialization(facilityId, newSpec.trim())
    setNewSpec('')
    const s = await getSpecializations(facilityId)
    setSpecializations(s)
    toast.success('تم إضافة التخصص')
  }

  const handleAddIns = async (e) => {
    e.preventDefault()
    if (!newIns.trim()) return
    await addInsuranceCompany(facilityId, newIns.trim())
    setNewIns('')
    const i = await getInsuranceCompanies(facilityId)
    setInsurance(i)
    toast.success('تم إضافة شركة التأمين')
  }

  if (loading) return <Spinner size="lg" className="py-32" />

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">معلومات المرفق</h1>

      {/* Basic Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-bold text-gray-700 mb-4">البيانات الأساسية</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المرفق</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              dir="ltr"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </form>
      </div>

      {/* Specializations */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-bold text-gray-700 mb-4">التخصصات الطبية</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {specializations.map((s) => (
            <span key={s.id} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
              {s.name}
            </span>
          ))}
          {specializations.length === 0 && (
            <p className="text-sm text-gray-400">لا توجد تخصصات بعد</p>
          )}
        </div>
        <form onSubmit={handleAddSpec} className="flex gap-2">
          <input
            type="text"
            value={newSpec}
            onChange={(e) => setNewSpec(e.target.value)}
            placeholder="أضف تخصصاً جديداً..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
          >
            إضافة
          </button>
        </form>
      </div>

      {/* Insurance Companies */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-bold text-gray-700 mb-4">شركات التأمين المعتمدة</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {insurance.map((i) => (
            <span key={i.id} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
              {i.name}
            </span>
          ))}
          {insurance.length === 0 && (
            <p className="text-sm text-gray-400">لا توجد شركات تأمين بعد</p>
          )}
        </div>
        <form onSubmit={handleAddIns} className="flex gap-2">
          <input
            type="text"
            value={newIns}
            onChange={(e) => setNewIns(e.target.value)}
            placeholder="أضف شركة تأمين..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
          >
            إضافة
          </button>
        </form>
      </div>
    </div>
  )
}

export default FacilityInfo

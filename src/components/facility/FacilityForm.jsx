import { useState } from 'react'
import FacilityImageUpload from './FacilityImageUpload'

const INITIAL = {
  name: '',
  address: '',
  phone: '',
  adminPassword: '',
  order: 0,
  available: true,
  imageUrl: '',
}

const FacilityForm = ({ initialData = {}, onSubmit, loading }) => {
  const [form, setForm] = useState({ ...INITIAL, ...initialData })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ ...form, order: Number(form.order) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FacilityImageUpload
        facilityId={initialData.id}
        currentUrl={form.imageUrl}
        onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم المرفق *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="مستشفى الرحمة"
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
            placeholder="المدينة، الشارع"
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
            placeholder="+966 5X XXX XXXX"
            dir="ltr"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ترتيب العرض</label>
          <input
            type="number"
            name="order"
            value={form.order}
            onChange={handleChange}
            min={0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            كلمة مرور المدير {initialData.id ? '(اتركها فارغة للإبقاء)' : '*'}
          </label>
          <input
            type="text"
            name="adminPassword"
            value={form.adminPassword}
            onChange={handleChange}
            required={!initialData.id}
            placeholder="كلمة مرور قوية"
            dir="ltr"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="available"
          id="available"
          checked={form.available}
          onChange={handleChange}
          className="w-4 h-4 accent-blue-600"
        />
        <label htmlFor="available" className="text-sm font-medium text-gray-700">
          المرفق نشط (ظاهر للمرضى)
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
      >
        {loading ? 'جاري الحفظ...' : initialData.id ? 'حفظ التعديلات' : 'إضافة المرفق'}
      </button>
    </form>
  )
}

export default FacilityForm

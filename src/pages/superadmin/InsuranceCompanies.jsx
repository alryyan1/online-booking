import { useEffect, useState } from 'react'
import {
  getInsuranceCompanies,
  createInsuranceCompany,
  updateInsuranceCompany,
  deleteInsuranceCompany,
} from '../../services/insuranceService'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const EMPTY = { name: '', description: '', phone: '', enabled: true }

const InsuranceFormFields = ({ form, setForm }) => {
  const handle = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">اسم الشركة *</label>
        <input
          name="name"
          value={form.name}
          onChange={handle}
          required
          placeholder="شركة التأمين..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
        <input
          name="phone"
          value={form.phone}
          onChange={handle}
          dir="ltr"
          placeholder="09XXXXXXXX"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handle}
          rows={3}
          placeholder="وصف الشركة..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          name="enabled"
          id="enabled"
          checked={form.enabled}
          onChange={handle}
          className="w-4 h-4 accent-blue-600"
        />
        <label htmlFor="enabled" className="text-sm font-medium text-gray-700">الشركة مفعلة</label>
      </div>
    </div>
  )
}

const InsuranceCompanies = () => {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getInsuranceCompanies()
      setCompanies(data)
    } catch {
      toast.error('حدث خطأ أثناء تحميل شركات التأمين')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = search.trim()
    ? companies.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : companies

  const openAdd = () => { setForm(EMPTY); setEditTarget(null); setModalOpen(true) }
  const openEdit = (c) => { setForm({ ...EMPTY, ...c }); setEditTarget(c); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('اسم الشركة مطلوب'); return }
    setSaving(true)
    try {
      if (editTarget) {
        await updateInsuranceCompany(editTarget.id, form)
        toast.success('تم تحديث الشركة')
      } else {
        await createInsuranceCompany(form)
        toast.success('تم إضافة الشركة بنجاح')
      }
      closeModal()
      load()
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (company) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${company.name}"؟`)) return
    try {
      await deleteInsuranceCompany(company.id)
      toast.success('تم حذف الشركة')
      load()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const handleToggle = async (company) => {
    try {
      await updateInsuranceCompany(company.id, { enabled: !company.enabled })
      toast.success(company.enabled ? 'تم إيقاف الشركة' : 'تم تفعيل الشركة')
      load()
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const enabledCount = companies.filter((c) => c.enabled !== false).length

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">شركات التأمين</h1>
          <p className="text-gray-500 text-sm mt-1">
            {companies.length} شركة إجمالي — {enabledCount} مفعلة
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="بحث في الشركات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
          <button
            onClick={openAdd}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm whitespace-nowrap"
          >
            + إضافة شركة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-2xl p-5">
          <div className="text-3xl mb-1">🛡️</div>
          <div className="text-2xl font-bold text-blue-700">{companies.length}</div>
          <div className="text-xs text-blue-600 font-medium">إجمالي الشركات</div>
        </div>
        <div className="bg-teal-50 rounded-2xl p-5">
          <div className="text-3xl mb-1">✅</div>
          <div className="text-2xl font-bold text-teal-700">{enabledCount}</div>
          <div className="text-xs text-teal-600 font-medium">شركات مفعلة</div>
        </div>
        <div className="bg-orange-50 rounded-2xl p-5">
          <div className="text-3xl mb-1">⏸️</div>
          <div className="text-2xl font-bold text-orange-600">{companies.length - enabledCount}</div>
          <div className="text-xs text-orange-500 font-medium">معطلة</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">🛡️</div>
          <p className="text-lg">{search ? 'لا توجد نتائج للبحث' : 'لا توجد شركات تأمين بعد'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-right">
              <tr>
                <th className="px-5 py-3 font-medium">الشركة</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">الهاتف</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">الوصف</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl flex-shrink-0">
                        🛡️
                      </div>
                      <p className="font-medium text-gray-800">{company.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell" dir="ltr">
                    {company.phone || '-'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 hidden md:table-cell max-w-[200px] truncate">
                    {company.description || '-'}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggle(company)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition
                        ${company.enabled !== false
                          ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                          : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
                    >
                      {company.enabled !== false ? 'مفعل' : 'معطل'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(company)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">تعديل</button>
                      <button onClick={() => handleDelete(company)} className="text-red-500 hover:text-red-700 font-medium text-xs">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'تعديل شركة التأمين' : 'إضافة شركة تأمين جديدة'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <InsuranceFormFields form={form} setForm={setForm} />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إضافة الشركة'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default InsuranceCompanies

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllFacilities } from '../../services/facilityService'
import { getSpecialties } from '../../services/specialtyService'
import { getInsuranceCompanies } from '../../services/insuranceService'
import Spinner from '../../components/common/Spinner'

const SuperAdminDashboard = () => {
  const [facilities, setFacilities] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [insurance, setInsurance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getAllFacilities(),
      getSpecialties(),
      getInsuranceCompanies(),
    ]).then(([facs, specs, ins]) => {
      setFacilities(facs)
      setSpecialties(specs)
      setInsurance(ins)
    }).finally(() => setLoading(false))
  }, [])

  const available = facilities.filter((f) => f.available).length
  const unavailable = facilities.length - available
  const activeSpecs = specialties.filter((s) => s.active !== false).length
  const enabledInsurance = insurance.filter((c) => c.enabled !== false).length

  const stats = [
    { label: 'إجمالي المرافق', value: facilities.length, icon: '🏥', color: 'bg-blue-50 text-blue-700' },
    { label: 'مرافق نشطة', value: available, icon: '✅', color: 'bg-green-50 text-green-700' },
    { label: 'مرافق معطلة', value: unavailable, icon: '⛔', color: 'bg-red-50 text-red-700' },
    { label: 'إجمالي التخصصات', value: specialties.length, icon: '⚕️', color: 'bg-purple-50 text-purple-700' },
    { label: 'تخصصات نشطة', value: activeSpecs, icon: '✨', color: 'bg-teal-50 text-teal-700' },
    { label: 'شركات التأمين', value: insurance.length, icon: '🛡️', color: 'bg-indigo-50 text-indigo-700' },
    { label: 'تأمين مفعّل', value: enabledInsurance, icon: '🔵', color: 'bg-sky-50 text-sky-700' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">لوحة تحكم المشرف العام</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة جميع المرافق الصحية</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/superadmin/insurance"
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium text-sm whitespace-nowrap"
          >
            🛡️ التأمين
          </Link>
          <Link
            to="/superadmin/specialties"
            className="bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 transition font-medium text-sm whitespace-nowrap"
          >
            ⚕️ التخصصات
          </Link>
          <Link
            to="/superadmin/doctors"
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition font-medium text-sm whitespace-nowrap"
          >
            👨‍⚕️ الأطباء
          </Link>
          <Link
            to="/superadmin/facilities"
            className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium text-sm whitespace-nowrap"
          >
            + مرفق
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 mb-10">
        {stats.map((s) => (
          <div key={s.label} className={`${s.color} rounded-2xl p-6`}>
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Facilities List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-800">المرافق الصحية</h2>
          <Link to="/superadmin/facilities" className="text-blue-600 text-sm hover:underline">
            إدارة الكل
          </Link>
        </div>
        {loading ? (
          <Spinner size="md" className="py-10" />
        ) : facilities.length === 0 ? (
          <p className="text-center text-gray-400 py-10">لا توجد مرافق بعد</p>
        ) : (
          <div className="divide-y">
            {facilities.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl overflow-hidden">
                    {f.imageUrl ? <img src={f.imageUrl} alt={f.name} className="w-full h-full object-cover" /> : '🏥'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{f.name}</p>
                    <p className="text-xs text-gray-500">{f.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${f.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {f.available ? 'نشط' : 'معطل'}
                  </span>
                  <Link
                    to={`/superadmin/facilities/${f.id}`}
                    className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-lg hover:bg-purple-100 transition"
                  >
                    لوحة التحكم
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SuperAdminDashboard

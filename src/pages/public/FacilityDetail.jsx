import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFacilityById } from '../../services/facilityService'
import { getCentralDoctors } from '../../services/doctorService'
import Spinner from '../../components/common/Spinner'

const FacilityDetail = () => {
  const { facilityId } = useParams()
  const [facility, setFacility] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [f, d] = await Promise.all([
        getFacilityById(facilityId),
        getCentralDoctors(),
      ])
      setFacility(f)
      setDoctors(d)
      setLoading(false)
    }
    load()
  }, [facilityId])

  if (loading) return <Spinner size="lg" className="py-32" />
  if (!facility) return (
    <div className="text-center py-32 text-gray-400">
      <div className="text-6xl mb-4">❌</div>
      <p>المرفق غير موجود</p>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Facility Header */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-8">
        <div className="h-56 bg-gradient-to-br from-blue-100 to-indigo-200">
          {facility.imageUrl ? (
            <img src={facility.imageUrl} alt={facility.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl">🏥</div>
          )}
        </div>
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">{facility.name}</h1>
          <div className="flex flex-wrap gap-6 text-gray-600">
            {facility.address && (
              <span className="flex items-center gap-2">📍 {facility.address}</span>
            )}
            {facility.phone && (
              <span className="flex items-center gap-2" dir="ltr">📞 {facility.phone}</span>
            )}
          </div>
        </div>
      </div>

      {/* Doctors Preview */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">الأطباء المتاحون ({doctors.length})</h2>
        <Link
          to={`/facility/${facilityId}/doctors`}
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          عرض الكل ←
        </Link>
      </div>

      {doctors.length === 0 ? (
        <div className="text-center text-gray-400 py-10 bg-white rounded-xl shadow-sm">
          لا يوجد أطباء متاحون حالياً
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {doctors.slice(0, 4).map((doctor) => (
            <div key={doctor.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 border border-gray-100">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
                {doctor.imageUrl ? (
                  <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover rounded-full" />
                ) : '👨‍⚕️'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{doctor.name}</p>
                {doctor.specialization && (
                  <p className="text-sm text-blue-600">{doctor.specialization}</p>
                )}
              </div>
              <Link
                to={`/facility/${facilityId}/book/${doctor.id}`}
                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
              >
                احجز
              </Link>
            </div>
          ))}
        </div>
      )}

      {doctors.length > 4 && (
        <div className="text-center mt-6">
          <Link
            to={`/facility/${facilityId}/doctors`}
            className="inline-block bg-blue-50 text-blue-700 px-8 py-3 rounded-full hover:bg-blue-100 transition font-medium"
          >
            عرض جميع الأطباء ({doctors.length})
          </Link>
        </div>
      )}
    </div>
  )
}

export default FacilityDetail

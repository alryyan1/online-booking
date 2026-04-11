import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFacilityById } from '../../services/facilityService'
import { getCentralDoctors } from '../../services/doctorService'
import DoctorCard from '../../components/doctor/DoctorCard'
import Spinner from '../../components/common/Spinner'

const DoctorListing = () => {
  const { facilityId } = useParams()
  const [facility, setFacility] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [f, d] = await Promise.all([
        getFacilityById(facilityId),
        getCentralDoctors(),
      ])
      setFacility(f)
      setDoctors(d)
      setFiltered(d)
      setLoading(false)
    }
    load()
  }, [facilityId])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(doctors)
    } else {
      const q = search.toLowerCase()
      setFiltered(
        doctors.filter(
          (d) =>
            d.name?.toLowerCase().includes(q) ||
            d.specialization?.toLowerCase().includes(q)
        )
      )
    }
  }, [search, doctors])

  if (loading) return <Spinner size="lg" className="py-32" />

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-blue-600">الرئيسية</Link>
        <span>›</span>
        <Link to={`/facility/${facilityId}`} className="hover:text-blue-600">
          {facility?.name}
        </Link>
        <span>›</span>
        <span className="text-gray-700">الأطباء</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          أطباء {facility?.name}
        </h1>
        <input
          type="text"
          placeholder="ابحث باسم الطبيب أو التخصص..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <div className="text-6xl mb-4">👨‍⚕️</div>
          <p>لا يوجد أطباء متاحون</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} facilityId={facilityId} />
          ))}
        </div>
      )}
    </div>
  )
}

export default DoctorListing

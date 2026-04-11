import { useFacilities } from '../../contexts/FacilityContext'
import FacilityCard from '../../components/facility/FacilityCard'
import Spinner from '../../components/common/Spinner'

const Home = () => {
  const { facilities, loading } = useFacilities()

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">منظومة الحجز الطبي</h1>
        <p className="text-blue-100 text-lg max-w-xl mx-auto">
          احجز موعدك مع أفضل الأطباء في أقرب مرفق صحي إليك بكل سهولة وسرعة
        </p>
        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <div className="bg-white/20 backdrop-blur px-6 py-3 rounded-full text-sm">
            ✅ حجز فوري
          </div>
          <div className="bg-white/20 backdrop-blur px-6 py-3 rounded-full text-sm">
            👨‍⚕️ أطباء متخصصون
          </div>
          <div className="bg-white/20 backdrop-blur px-6 py-3 rounded-full text-sm">
            🏥 مرافق متعددة
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
          المرافق الصحية المتاحة
        </h2>

        {loading ? (
          <Spinner size="lg" className="py-20" />
        ) : facilities.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <div className="text-6xl mb-4">🏥</div>
            <p className="text-lg">لا توجد مرافق صحية متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((facility) => (
              <FacilityCard key={facility.id} facility={facility} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Home

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getSpecializations, getDoctorsBySpec } from '../../services/facilityService'
import { getBookedSlots, createCallCenterAppointment } from '../../services/appointmentService'
import { getWorkingShifts, getDayName, formatDate, categorizeSlotsByShift } from '../../utils/bookingUtils'
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import toast from 'react-hot-toast'

const CallCenterBookToday = () => {
  const { facilityId } = useAuth()
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Today's Date info
  const today = new Date()
  const todayDate = formatDate(today)
  const todayDayName = getDayName(today)

  // Selection state
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedSpec, setSelectedSpec] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)

  // Form state
  const [showFormModal, setShowFormModal] = useState(false)
  const [patientData, setPatientData] = useState({ name: '', phone: '' })
  const [isBooking, setIsBooking] = useState(false)

  // Shift usage state
  const [bookedCounts, setBookedCounts] = useState({}) // { doctorId: { morning: X, evening: Y } }
  const [loadingCounts, setLoadingCounts] = useState(false)

  const loadData = async () => {
    if (!facilityId) return
    setLoading(true)
    try {
      const specs = await getSpecializations(facilityId)
      const specData = await Promise.all(
        specs.map(async (spec) => {
          const doctors = await getDoctorsBySpec(facilityId, spec.id)
          const workingToday = doctors
            .filter((d) => d.isActive !== false && d.isBookingEnabled !== false)
            .filter((d) => getWorkingShifts(d, today) !== null)
          return { ...spec, doctors: workingToday }
        })
      )
      const specsWithDoctors = specData.filter((s) => s.doctors.length > 0)
      setSpecialties(specsWithDoctors)

      // Auto-fetch counts for all doctors working today
      specsWithDoctors.forEach(spec => {
        spec.doctors.forEach(doc => fetchDoctorCounts(doc))
      })
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء تحميل البيانات')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [facilityId])

  const fetchDoctorCounts = async (doctor) => {
    if (bookedCounts[doctor.id]) return // Already cached
    setLoadingCounts(true)
    try {
      const slots = await getBookedSlots(facilityId, doctor.id, todayDate)
      const counts = categorizeSlotsByShift(slots, doctor.workingSchedule?.[todayDayName])
      setBookedCounts(prev => ({ ...prev, [doctor.id]: counts }))
    } catch (err) {
      console.error(err)
    }
    setLoadingCounts(false)
  }

  const handleBookNowClick = (doctor, spec) => {
    if (selectedDoctor?.id === doctor.id) {
      setSelectedDoctor(null)
      setSelectedShift(null)
    } else {
      setSelectedDoctor(doctor)
      setSelectedSpec(spec)
      setSelectedShift(null)
      fetchDoctorCounts(doctor)
    }
  }

  const handleShiftSelect = (shift) => {
    setSelectedShift(shift)
    setShowFormModal(true)
  }

  const handleConfirmBooking = async (e) => {
    e.preventDefault()
    if (!patientData.name.trim() || !patientData.phone.trim()) {
      toast.error('يرجى إدخال اسم المريض ورقم الهاتف')
      return
    }

    setIsBooking(true)
    try {
      await createCallCenterAppointment(facilityId, {
        centralSpecialtyId: selectedSpec.id,
        specializationName: selectedSpec.specName,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.docName,
        facilityId: facilityId,
        date: todayDate,
        period: selectedShift.type,
        time: selectedShift.start,
        patientName: patientData.name.trim(),
        patientPhone: patientData.phone.trim(),
      })
      toast.success('تم حجز الموعد بنجاح')
      
      // Refresh counts for this doctor
      const slots = await getBookedSlots(facilityId, selectedDoctor.id, todayDate)
      const counts = categorizeSlotsByShift(slots, selectedDoctor.workingSchedule?.[todayDayName])
      setBookedCounts(prev => ({ ...prev, [selectedDoctor.id]: counts }))

      setShowFormModal(false)
      setPatientData({ name: '', phone: '' })
      setSelectedDoctor(null)
      setSelectedShift(null)
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء إتمام الحجز')
    } finally {
      setIsBooking(false)
    }
  }

  // Smart filtering logic
  const filteredSpecialties = specialties.map(spec => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return spec

    const specMatches = spec.specName.toLowerCase().includes(term)
    const filteredDoctors = spec.doctors.filter(doc => 
      doc.docName.toLowerCase().includes(term)
    )

    if (specMatches) return spec
    if (filteredDoctors.length > 0) return { ...spec, doctors: filteredDoctors }
    return null
  }).filter(Boolean)

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-right">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3 justify-end">
              <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-lg animate-pulse">LIVE</span>
              حجز اليوم - {todayDate}
           </h1>
           <p className="text-gray-500 mt-1">اختر الطبيب والفترة مباشرة لإتمام الحجز.</p>
        </div>

        {/* Search Interface */}
        <div className="relative w-full md:max-w-md group">
           <input 
             type="text" 
             placeholder="ابحث باسم الطبيب أو التخصص..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full text-right bg-white border-2 border-gray-100 rounded-2xl pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_0_15px_rgba(37,99,235,0.1)] transition-all font-bold placeholder:text-gray-300"
           />
           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600 transition-colors text-xl">🔍</span>
           {searchTerm && (
             <button 
               onClick={() => setSearchTerm('')}
               className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors"
             >
               ✕
             </button>
           )}
        </div>
      </header>

      <div className="space-y-16">
        {specialties.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100 shadow-sm">
            <div className="text-6xl mb-4 opacity-20 transition-transform hover:scale-110 duration-500">🏥</div>
            <p className="text-gray-400 text-xl font-medium">لا يوجد أطباء مداومون اليوم</p>
          </div>
        ) : filteredSpecialties.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
             <div className="text-6xl mb-4 opacity-20">🔎</div>
             <p className="text-gray-400 text-lg font-bold">لا توجد نتائج تطابق "{searchTerm}"</p>
             <button onClick={() => setSearchTerm('')} className="mt-4 text-blue-600 font-bold hover:underline">عرض الكل ←</button>
          </div>
        ) : (
          filteredSpecialties.map((spec) => (
            <section key={spec.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-100">
                  {spec.specName.charAt(0)}
                </div>
                <h2 className="text-xl font-black text-gray-800">{spec.specName}</h2>
                <div className="h-px flex-1 bg-gradient-to-l from-gray-100 to-transparent"></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{spec.doctors.length} أطباء</span>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">الطبيب</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الفترة الصباحية</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الفترة المسائية</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {spec.doctors.map((doc) => {
                        const shifts = getWorkingShifts(doc, today) || []
                        const morningShift = shifts.find(s => s.type === 'morning')
                        const eveningShift = shifts.find(s => s.type === 'evening')
                        const counts = bookedCounts[doc.id] || { morning: 0, evening: 0 }
                        const hasCounts = !!bookedCounts[doc.id]

                        const renderShiftCell = (shift) => {
                          if (!shift) return <td className="px-6 py-4 text-center text-gray-300 text-xs italic">غير متاح</td>
                          
                          const limit = doc[shift.type + 'PatientLimit'] || 0
                          const booked = counts[shift.type] || 0
                          const isFull = limit > 0 && booked >= limit

                          return (
                            <td className="px-6 py-4">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="flex items-center gap-3">
                                   <div className="text-center min-w-[60px]">
                                      <p className="text-xs font-black text-gray-900 mb-0.5" dir="ltr">{shift.start}</p>
                                      <div className={`px-2 py-0.5 rounded-md text-[11px] font-black border transition-colors ${
                                        isFull 
                                          ? 'bg-red-50 text-red-600 border-red-100' 
                                          : hasCounts ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                                      }`}>
                                         {hasCounts ? `${booked} / ${limit}` : '-- / --'}
                                      </div>
                                   </div>
                                   <button
                                     onClick={() => {
                                       setSelectedDoctor(doc)
                                       setSelectedSpec(spec)
                                       setSelectedShift(shift)
                                       setShowFormModal(true)
                                     }}
                                     onMouseEnter={() => fetchDoctorCounts(doc)}
                                     disabled={isFull}
                                     className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
                                       isFull 
                                         ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-100'
                                         : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 active:scale-95'
                                     }`}
                                   >
                                     {isFull ? 'مغلق' : 'حجز'}
                                   </button>
                                </div>
                              </div>
                            </td>
                          )
                        }

                        return (
                          <tr key={doc.id} className="hover:bg-blue-50/10 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0 border border-gray-100 group-hover:border-blue-200 transition-colors">
                                  {doc.photoUrl ? <img src={doc.photoUrl} className="w-full h-full object-cover rounded-xl" /> : '👨‍⚕️'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-800 group-hover:text-blue-900 transition-colors truncate">{doc.docName}</p>
                                  <p className="text-[10px] text-gray-400 font-bold tracking-tight">{doc.phoneNumber || 'بدون رقم'}</p>
                                </div>
                              </div>
                            </td>
                            {renderShiftCell(morningShift)}
                            {renderShiftCell(eveningShift)}
                            <td className="px-6 py-4 text-center">
                               <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                                 doc.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                               }`}>
                                 {doc.isActive ? 'نشط' : 'متوقف'}
                               </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))
        )}
      </div>

      {/* Patient Form Modal */}
      <Modal 
        isOpen={showFormModal} 
        onClose={() => setShowFormModal(false)}
        title={`حجز موعد - ${selectedDoctor?.docName}`}
        size="md"
      >
        <div className="space-y-6">
           <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
              <div className="text-right">
                 <p className="text-[10px] font-black text-blue-400 uppercase">الموعد</p>
                 <p className="text-sm font-black text-blue-900">{todayDate} | {selectedShift?.label}</p>
              </div>
              <div className="text-blue-600 text-xl font-bold" dir="ltr">{selectedShift?.start}</div>
           </div>

           <form onSubmit={handleConfirmBooking} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-xs font-black text-gray-700 pr-1 uppercase">اسم المريض الكامل</label>
                 <input 
                   type="text"
                   required
                   value={patientData.name}
                   onChange={(e) => setPatientData({...patientData, name: e.target.value})}
                   placeholder="أدخل الاسم الرباعي"
                   className="w-full border-2 border-gray-50 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-600 bg-gray-50/30 transition-colors"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-black text-gray-700 pr-1 uppercase">رقم الهاتف للاتصال</label>
                 <input 
                   type="tel"
                   required
                   value={patientData.phone}
                   onChange={(e) => setPatientData({...patientData, phone: e.target.value})}
                   placeholder="مثلاً: 09XXXXXXXX"
                   className="w-full border-2 border-gray-50 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-600 bg-gray-50/30 transition-colors"
                   dir="ltr"
                 />
              </div>

              <div className="pt-2">
                 <button 
                   type="submit"
                   disabled={isBooking}
                   className="w-full bg-green-600 text-white font-black py-5 rounded-2xl hover:bg-green-700 transition active:scale-[0.98] shadow-2xl shadow-green-100 flex items-center justify-center gap-3 disabled:opacity-50 text-xl"
                 >
                    {isBooking ? <Spinner size="sm" /> : '✓'}
                    {isBooking ? 'جاري الحفظ...' : 'تأكيد الحجز الآن'}
                 </button>
              </div>
           </form>
        </div>
      </Modal>
    </div>
  )
}

export default CallCenterBookToday

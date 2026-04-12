import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getSpecializations, getDoctorsBySpec } from '../../services/facilityService'
import { getBookedSlots, createCallCenterAppointment } from '../../services/appointmentService'
import { getAvailableBookingDays, getEarliestAvailableDate, categorizeSlotsByShift } from '../../utils/bookingUtils'
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import toast from 'react-hot-toast'

const CallCenterBookNow = () => {
  const { facilityId } = useAuth()
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Selection state
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedSpec, setSelectedSpec] = useState(null)
  const [docSelectedDates, setDocSelectedDates] = useState({}) // { docId: { date, dayName, shifts } }
  const [selectedShift, setSelectedShift] = useState(null)
  const [selectedDayRender, setSelectedDayRender] = useState(null) // for modal usage

  // Form state
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDatePickerModal, setShowDatePickerModal] = useState(false)
  const [doctorForDatePick, setDoctorForDatePick] = useState(null)
  const [patientData, setPatientData] = useState({ name: '', phone: '' })
  const [isBooking, setIsBooking] = useState(false)

  // Shift usage state - now supports multiple doctors
  const [bookedCounts, setBookedCounts] = useState({}) // { 'docId_date': { morning: X, evening: Y } }
  const [loadingCounts, setLoadingCounts] = useState(false)

  const loadData = async () => {
    if (!facilityId) return
    setLoading(true)
    try {
      const specs = await getSpecializations(facilityId)
      const initialDateMap = {}

      const specData = await Promise.all(
        specs.map(async (spec) => {
          const doctors = await getDoctorsBySpec(facilityId, spec.id)
          const availableDocs = doctors
            .filter((d) => d.isActive !== false && d.isBookingEnabled !== false)
            .map((d) => {
              const availableDays = getAvailableBookingDays(d)
              const earliest = availableDays.length > 0 ? availableDays[0] : null
              if (earliest) initialDateMap[d.id] = earliest
              
              return {
                ...d,
                availableDays,
                earliestDate: earliest?.date || '9999-99-99',
              }
            })
            .sort((a, b) => a.earliestDate.localeCompare(b.earliestDate))

          return { ...spec, doctors: availableDocs }
        })
      )

      const finalSpecs = specData.filter((s) => s.doctors.length > 0)
      setSpecialties(finalSpecs)
      setDocSelectedDates(initialDateMap)

      // Initial fetch for all earliest dates
      Object.entries(initialDateMap).forEach(([docId, day]) => {
        const doctor = finalSpecs.flatMap(s => s.doctors).find(d => d.id === docId)
        if (doctor) {
          fetchCounts(doctor, day)
        }
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

  const fetchCounts = async (doctor, day) => {
    const key = `${doctor.id}_${day.date}`
    if (bookedCounts[key]) return
    setLoadingCounts(true)
    try {
      const slots = await getBookedSlots(facilityId, doctor.id, day.date)
      const counts = categorizeSlotsByShift(slots, doctor.workingSchedule?.[day.dayName])
      setBookedCounts(prev => ({ ...prev, [key]: counts }))
    } catch (err) {
      console.error(err)
    }
    setLoadingCounts(false)
  }

  const handleBookNowClick = (doctor, spec) => {
    if (selectedDoctor?.id === doctor.id) {
      setSelectedDoctor(null)
      setSelectedDay(null)
      setSelectedShift(null)
    } else {
      setSelectedDoctor(doctor)
      setSelectedSpec(spec)
      setSelectedDay(null)
      setSelectedShift(null)
    }
  }

  const handleDaySelect = (doctor, day) => {
    setDocSelectedDates(prev => ({ ...prev, [doctor.id]: day }))
    fetchCounts(doctor, day)
  }

  const handleShiftSelect = (doctor, spec, day, shift) => {
    setSelectedDoctor(doctor)
    setSelectedSpec(spec)
    setSelectedDayRender(day)
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
        date: selectedDayRender.date,
        period: selectedShift.type,
        time: selectedShift.start,
        patientName: patientData.name.trim(),
        patientPhone: patientData.phone.trim(),
      })
      toast.success('تم حجز الموعد بنجاح')
      
      // Refresh counts for this day
      const key = `${selectedDoctor.id}_${selectedDayRender.date}`
      const slots = await getBookedSlots(facilityId, selectedDoctor.id, selectedDayRender.date)
      const counts = categorizeSlotsByShift(slots, selectedDoctor.workingSchedule?.[selectedDayRender.dayName])
      setBookedCounts(prev => ({ ...prev, [key]: counts }))

      setShowFormModal(false)
      setPatientData({ name: '', phone: '' })
      setSelectedDoctor(null)
      setSelectedDayRender(null)
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

    if (specMatches) return spec // If spec name matches, show all its doctors
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
           <h1 className="text-2xl font-black text-gray-800">حجز موعد جديد</h1>
           <p className="text-gray-500 mt-1">اختر الطبيب المناسب للمريض بناءً على المواعيد المتاحة.</p>
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
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-lg font-bold">لا يوجد أطباء متاحون للحجز حالياً</p>
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
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">
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
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">التاريخ المختار</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الفترة الصباحية</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الفترة المسائية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {spec.doctors.map((doc) => {
                        const activeDay = docSelectedDates[doc.id]
                        const countsKey = activeDay ? `${doc.id}_${activeDay.date}` : ''
                        const counts = bookedCounts[countsKey] || { morning: 0, evening: 0 }
                        const hasCounts = !!bookedCounts[countsKey]

                        const renderShiftCell = (shiftType) => {
                          const shift = activeDay?.shifts.find(s => s.type === shiftType)
                          if (!shift) return <td className="px-6 py-4 text-center text-gray-300 text-[10px] italic">غير متاح</td>
                          
                          const limit = doc[shiftType + 'PatientLimit'] || 0
                          const booked = counts[shiftType] || 0
                          const isFull = limit > 0 && booked >= limit

                          return (
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-3">
                                 <div className="text-center min-w-[50px]">
                                    <p className="text-[11px] font-black text-gray-900" dir="ltr">{shift.start}</p>
                                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                      isFull ? 'bg-red-50 text-red-600 border-red-100' : hasCounts ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-50'
                                    }`}>
                                      {hasCounts ? `${booked}/${limit}` : '--/--'}
                                    </div>
                                 </div>
                                 <button
                                   onClick={() => handleShiftSelect(doc, spec, activeDay, shift)}
                                   disabled={isFull || !hasCounts && loadingCounts}
                                   className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                                     isFull 
                                       ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                       : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 active:scale-95'
                                   }`}
                                 >
                                   {isFull ? 'مغلق' : 'حجز'}
                                 </button>
                              </div>
                            </td>
                          )
                        }

                        return (
                          <tr key={doc.id} className="hover:bg-indigo-50/10 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0 border border-gray-100 transition-all group-hover:scale-110">
                                  {doc.photoUrl ? <img src={doc.photoUrl} className="w-full h-full object-cover rounded-xl" /> : '👨‍⚕️'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-800 group-hover:text-indigo-900 transition-colors truncate">{doc.docName}</p>
                                  <p className="text-[10px] text-gray-400 font-bold tracking-tight">{doc.phoneNumber || 'بدون رقم'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center">
                                <button
                                  onClick={() => {
                                    setDoctorForDatePick(doc)
                                    setShowDatePickerModal(true)
                                  }}
                                  className="group/date flex items-center gap-2 bg-indigo-50/50 hover:bg-indigo-600 border border-indigo-100 hover:border-indigo-600 px-4 py-2 rounded-xl transition-all duration-300"
                                >
                                  <div className="text-right">
                                    <p className="text-[10px] font-black text-indigo-400 group-hover/date:text-indigo-100 transition-colors uppercase leading-none mb-1">تغيير التاريخ</p>
                                    <p className="text-xs font-black text-indigo-900 group-hover/date:text-white transition-colors">{activeDay?.dayName} {activeDay?.date.split('-').reverse().slice(0,2).join('/')}</p>
                                  </div>
                                  <span className="text-xl group-hover/date:scale-110 transition-transform">📅</span>
                                </button>
                              </div>
                            </td>
                            {renderShiftCell('morning')}
                            {renderShiftCell('evening')}
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
                 <p className="text-[10px] font-black text-blue-400 uppercase">الموعد المحدد</p>
                 <p className="text-sm font-black text-blue-900">{selectedDayRender?.dayName}، {selectedDayRender?.date}</p>
                 <p className="text-xs text-blue-600 font-bold mt-0.5">الفترة: {selectedShift?.label}</p>
              </div>
              <div className="text-blue-600 text-2xl font-black" dir="ltr">{selectedShift?.start}</div>
           </div>

           <form onSubmit={handleConfirmBooking} className="space-y-6">
              <div className="space-y-2 text-right">
                 <label className="text-xs font-black text-gray-700 pr-1 uppercase">اسم المريض الكامل</label>
                 <input 
                   type="text"
                   required
                   value={patientData.name}
                   onChange={(e) => setPatientData({...patientData, name: e.target.value})}
                   placeholder="الاسم الرباعي"
                   className="w-full border-2 border-gray-50 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-600 bg-gray-50/30 transition-all text-right"
                 />
              </div>
              <div className="space-y-2 text-right">
                 <label className="text-xs font-black text-gray-700 pr-1 uppercase">رقم الهاتف</label>
                 <input 
                   type="tel"
                   required
                   value={patientData.phone}
                   onChange={(e) => setPatientData({...patientData, phone: e.target.value})}
                   placeholder="09XXXXXXXX"
                   className="w-full border-2 border-gray-50 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-600 bg-gray-50/30 transition-all"
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
                    {isBooking ? 'جاري الحفظ...' : 'تأكيد الحجز النهائي'}
                 </button>
              </div>
           </form>
        </div>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        isOpen={showDatePickerModal}
        onClose={() => setShowDatePickerModal(false)}
        title={`اختيار التاريخ - د. ${doctorForDatePick?.docName}`}
        size="md"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4">
          {doctorForDatePick?.availableDays.map((day) => {
            const isSelected = docSelectedDates[doctorForDatePick.id]?.date === day.date
            return (
              <button
                key={day.date}
                onClick={() => {
                  handleDaySelect(doctorForDatePick, day)
                  setShowDatePickerModal(false)
                }}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' 
                    : 'border-gray-50 bg-gray-50 hover:border-indigo-200 hover:bg-white text-gray-700'
                }`}
              >
                <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                  {day.dayName}
                </span>
                <span className="text-sm font-black tracking-tight">
                  {day.date.split('-').reverse().slice(0,2).join('/')}
                </span>
                {isSelected && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">مختار</span>}
              </button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}

export default CallCenterBookNow

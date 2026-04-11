import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCentralDoctorById } from '../../services/doctorService'
import { getFacilityById, getInsuranceCompanies } from '../../services/facilityService'
import { bookAppointment } from '../../services/appointmentService'
import { useAuth } from '../../contexts/AuthContext'
import TimeSlotPicker from '../../components/appointment/TimeSlotPicker'
import Spinner from '../../components/common/Spinner'
import { getMinDate, formatDateArabic } from '../../utils/dateHelpers'
import toast from 'react-hot-toast'

const STEPS = ['اختر التاريخ', 'اختر الوقت', 'بيانات الحجز', 'تأكيد']

const BookingPage = () => {
  const { facilityId, doctorId } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [doctor, setDoctor] = useState(null)
  const [facility, setFacility] = useState(null)
  const [insurance, setInsurance] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [step, setStep] = useState(0)
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [selectedInsurance, setSelectedInsurance] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    Promise.all([
      getCentralDoctorById(doctorId),
      getFacilityById(facilityId),
      getInsuranceCompanies(facilityId),
    ]).then(([d, f, ins]) => {
      setDoctor(d)
      setFacility(f)
      setInsurance(ins)
      setLoading(false)
    })
  }, [facilityId, doctorId])

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await bookAppointment(facilityId, {
        doctorId,
        doctorName: doctor.name,
        facilityId,
        facilityName: facility.name,
        patientId: currentUser.uid,
        patientEmail: currentUser.email,
        date,
        timeSlot,
        insurance: selectedInsurance,
        notes,
      })
      toast.success('تم حجز الموعد بنجاح!')
      navigate('/my-appointments')
    } catch (err) {
      if (err.message === 'SLOT_TAKEN') {
        toast.error('عذراً، هذا الموعد محجوز. يرجى اختيار وقت آخر.')
        setStep(1)
        setTimeSlot('')
      } else {
        toast.error('حدث خطأ أثناء الحجز، يرجى المحاولة مرة أخرى')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner size="lg" className="py-32" />

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-blue-600">الرئيسية</Link>
        <span>›</span>
        <Link to={`/facility/${facilityId}`} className="hover:text-blue-600">{facility?.name}</Link>
        <span>›</span>
        <span className="text-gray-700">حجز موعد</span>
      </div>

      {/* Doctor Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl">
          {doctor?.imageUrl ? (
            <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover rounded-full" />
          ) : '👨‍⚕️'}
        </div>
        <div>
          <p className="font-bold text-gray-800 text-lg">{doctor?.name}</p>
          {doctor?.specialization && <p className="text-blue-600 text-sm">{doctor.specialization}</p>}
          <p className="text-gray-500 text-sm">{facility?.name}</p>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-4 right-0 left-0 h-0.5 bg-gray-200 -z-10" />
        {STEPS.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition
              ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className="text-xs text-gray-500 hidden sm:block">{label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Step 0: Date */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">اختر التاريخ</h2>
            <input
              type="date"
              min={getMinDate()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
            <button
              onClick={() => { if (date) { setStep(1) } else { toast.error('يرجى اختيار التاريخ') } }}
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              التالي
            </button>
          </div>
        )}

        {/* Step 1: Time Slot */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">اختر الوقت</h2>
            <p className="text-sm text-gray-500 mb-4">{formatDateArabic(date)}</p>
            <TimeSlotPicker
              facilityId={facilityId}
              doctorId={doctorId}
              date={date}
              selected={timeSlot}
              onSelect={setTimeSlot}
            />
            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(0)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition">
                السابق
              </button>
              <button
                onClick={() => { if (timeSlot) { setStep(2) } else { toast.error('يرجى اختيار وقت المراجعة') } }}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                التالي
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">بيانات الحجز</h2>
            {insurance.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">شركة التأمين (اختياري)</label>
                <select
                  value={selectedInsurance}
                  onChange={(e) => setSelectedInsurance(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">بدون تأمين</option>
                  {insurance.map((ins) => (
                    <option key={ins.id} value={ins.name}>{ins.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="أي معلومات إضافية تريد إخبار الطبيب بها..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition">
                السابق
              </button>
              <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium">
                التالي
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">تأكيد الحجز</h2>
            <div className="bg-blue-50 rounded-xl p-5 space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">الطبيب</span>
                <span className="font-medium text-gray-800">{doctor?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">التخصص</span>
                <span className="font-medium text-gray-800">{doctor?.specialization || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">التاريخ</span>
                <span className="font-medium text-gray-800">{formatDateArabic(date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">الوقت</span>
                <span className="font-medium text-gray-800" dir="ltr">{timeSlot}</span>
              </div>
              {selectedInsurance && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">التأمين</span>
                  <span className="font-medium text-gray-800">{selectedInsurance}</span>
                </div>
              )}
              {notes && (
                <div className="text-sm">
                  <span className="text-gray-500">ملاحظات: </span>
                  <span className="text-gray-700">{notes}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition">
                السابق
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Spinner size="sm" /> : null}
                {submitting ? 'جاري الحجز...' : 'تأكيد الحجز'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingPage

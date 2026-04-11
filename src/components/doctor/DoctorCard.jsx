import { Link } from 'react-router-dom'

const DoctorCard = ({ doctor, facilityId }) => {
  const { id, name, specialization, imageUrl, photoUrl, bio, workingDays } = doctor

  const displayImage = imageUrl || photoUrl

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100 p-5 flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
          {displayImage ? (
            <img src={displayImage} alt={name} className="w-full h-full object-cover" />
          ) : '👨‍⚕️'}
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{name}</h3>
          {specialization && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {specialization}
            </span>
          )}
        </div>
      </div>

      {bio && <p className="text-sm text-gray-500 mb-3 flex-1">{bio}</p>}

      {workingDays && workingDays.length > 0 && (
        <p className="text-xs text-gray-400 mb-4">
          🗓 أيام العمل: {workingDays.join(' - ')}
        </p>
      )}

      <Link
        to={`/facility/${facilityId}/book/${id}`}
        className="mt-auto block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
      >
        احجز موعداً
      </Link>
    </div>
  )
}

export default DoctorCard

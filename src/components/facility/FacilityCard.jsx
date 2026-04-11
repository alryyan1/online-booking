import { Link } from 'react-router-dom'

const FacilityCard = ({ facility }) => {
  const { id, name, address, phone, imageUrl } = facility

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow overflow-hidden border border-gray-100">
      <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-200 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🏥</div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-2">{name}</h3>
        {address && (
          <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
            <span>📍</span> {address}
          </p>
        )}
        {phone && (
          <p className="text-sm text-gray-500 flex items-center gap-1 mb-4" dir="ltr">
            <span>📞</span> {phone}
          </p>
        )}
        <Link
          to={`/facility/${id}`}
          className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
        >
          عرض التفاصيل
        </Link>
      </div>
    </div>
  )
}

export default FacilityCard

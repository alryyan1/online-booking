import { Link } from 'react-router-dom'

const NotFound = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
    <div className="text-8xl mb-6">🔍</div>
    <h1 className="text-4xl font-bold text-gray-800 mb-3">404</h1>
    <p className="text-gray-500 text-lg mb-8">الصفحة التي تبحث عنها غير موجودة</p>
    <Link
      to="/"
      className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition font-medium"
    >
      العودة إلى الرئيسية
    </Link>
  </div>
)

export default NotFound

const sizeMap = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' }

const Spinner = ({ size = 'md', className = '' }) => (
  <div className={`flex items-center justify-center py-8 ${className}`}>
    <div className={`${sizeMap[size] ?? sizeMap.md} animate-spin rounded-full border-2 border-gray-200 border-t-blue-600`} />
  </div>
)

export default Spinner

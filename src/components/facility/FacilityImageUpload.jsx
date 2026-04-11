import { useState, useRef } from 'react'
import { uploadFacilityImage } from '../../services/storageService'

const FacilityImageUpload = ({ facilityId, currentUrl, onUploaded }) => {
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || '')
  const inputRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 5 ميغابايت')
      return
    }

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)

    // Use a temp ID if facility not created yet
    const uploadId = facilityId || `temp_${Date.now()}`
    setUploading(true)
    try {
      const url = await uploadFacilityImage(uploadId, file, setProgress)
      onUploaded(url)
    } catch {
      alert('فشل رفع الصورة، يرجى المحاولة مرة أخرى')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">صورة المرفق</label>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-blue-400 transition text-center relative overflow-hidden"
      >
        {preview ? (
          <img src={preview} alt="preview" className="h-32 mx-auto object-contain rounded-lg" />
        ) : (
          <div className="py-6">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm text-gray-500">انقر لرفع صورة (حد أقصى 5MB)</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
            <div className="text-sm font-medium text-blue-600 mb-2">جاري الرفع {progress}%</div>
            <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}

export default FacilityImageUpload

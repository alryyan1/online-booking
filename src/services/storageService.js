import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { storage } from './firebase'

export const uploadFacilityImage = (facilityId, file, onProgress) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, `facilities/${facilityId}/image_${Date.now()}`)
    const uploadTask = uploadBytesResumable(storageRef, file)

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        )
        if (onProgress) onProgress(progress)
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref)
        resolve(url)
      }
    )
  })
}

export const deleteFacilityImage = async (imageUrl) => {
  if (!imageUrl) return
  try {
    const imageRef = ref(storage, imageUrl)
    await deleteObject(imageRef)
  } catch {
    // ignore if file doesn't exist
  }
}

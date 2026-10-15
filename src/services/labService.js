import {
  collection, doc, getDoc, getDocs, getCountFromServer, setDoc, serverTimestamp,
  query, where, orderBy, limit, startAfter,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db2, storage2 } from './firebase'

// نتائج المختبر محفوظة في مشروع Firebase الثاني:
// /{collectionName}/{receiptNo} → { patient_name, patient_phone, result_url, created_at, updated_at }

const ensureDb = () => {
  if (!db2) throw new Error('مشروع Firebase الثاني غير مهيأ')
  return db2
}

const toResult = (d) => ({ id: d.id, ...d.data() })

export const getLabResultsCount = async (collectionName) => {
  const snap = await getCountFromServer(collection(ensureDb(), collectionName))
  return snap.data().count
}

/**
 * صفحة من النتائج مرتبة من الأحدث.
 * @param {*} cursor آخر مستند في الصفحة السابقة (null للصفحة الأولى)
 * @returns {{ results, lastDoc }}
 */
export const getLabResultsPage = async (collectionName, pageSize, cursor = null) => {
  const constraints = [orderBy('created_at', 'desc'), limit(pageSize)]
  if (cursor) constraints.splice(1, 0, startAfter(cursor))
  const snap = await getDocs(query(collection(ensureDb(), collectionName), ...constraints))
  return { results: snap.docs.map(toResult), lastDoc: snap.docs[snap.docs.length - 1] || null }
}

export const getLabResultByReceipt = async (collectionName, receiptNo) => {
  const snap = await getDoc(doc(ensureDb(), collectionName, String(receiptNo)))
  return snap.exists() ? toResult(snap) : null
}

// بحث في كامل المجموعة: رقم الإيصال (مطابق)، الهاتف (مطابق)، الاسم (يبدأ بـ)
export const searchLabResults = async (collectionName, term, max = 50) => {
  const col = collection(ensureDb(), collectionName)
  // الهواتف محفوظة بصيغة 249xxxxxxxxx، فنقبل أيضاً الصيغة المحلية 0xxxxxxxxx
  const phones = [...new Set([term, term.replace(/^\+/, ''), term.replace(/^0/, '249')])]
  const [byReceipt, byPhone, byName] = await Promise.all([
    term.includes('/') ? null : getLabResultByReceipt(collectionName, term),
    getDocs(query(col, where('patient_phone', 'in', phones), limit(max))),
    getDocs(query(col, where('patient_name', '>=', term), where('patient_name', '<=', term + ''), limit(max))),
  ])
  const map = new Map()
  if (byReceipt) map.set(byReceipt.id, byReceipt)
  ;[...byPhone.docs, ...byName.docs].forEach((d) => map.set(d.id, toResult(d)))
  return [...map.values()]
}

/**
 * يضيف نتيجة جديدة: يرفع الملف إلى results/{collection}/{receipt}/ ثم ينشئ المستند
 * /{collection}/{receipt}. Firestore ينشئ المجموعة تلقائياً إن لم تكن موجودة.
 */
export const addLabResult = async (collectionName, { receiptNo, patientName, patientPhone, file }, onProgress) => {
  if (!storage2) throw new Error('مشروع Firebase الثاني غير مهيأ')
  const receipt = String(receiptNo).trim()
  const fileRef = storageRef(storage2, `results/${collectionName}/${receipt}/result.pdf`)

  const task = uploadBytesResumable(fileRef, file, { contentType: 'application/pdf' })
  await new Promise((resolve, reject) => {
    task.on('state_changed',
      (s) => onProgress?.(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      reject, resolve)
  })
  const resultUrl = await getDownloadURL(fileRef)

  await setDoc(doc(ensureDb(), collectionName, receipt), {
    patient_name: patientName.trim(),
    patient_phone: patientPhone?.trim() || '',
    result_url: resultUrl,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
}

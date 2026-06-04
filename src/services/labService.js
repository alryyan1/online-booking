import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'

const LAB_ID = 'ynG3gECkeUC6eQuVhhE9'

export const getPriceList = async () => {
  const snap = await getDocs(collection(db, 'labToLap', LAB_ID, 'pricelist'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

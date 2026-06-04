import { useEffect, useState, useRef } from 'react'
import { Search, X, FlaskConical, TestTube, Languages } from 'lucide-react'
import Spinner from '../../components/common/Spinner'
import { getPriceList } from '../../services/labService'
import toast from 'react-hot-toast'

const translateText = async (text) => {
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(text)}`
  )
  const data = await res.json()
  return data[0]?.map((x) => x?.[0] || '').join('') || ''
}

const PriceList = () => {
  const [items, setItems]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [translations, setTranslations] = useState({})
  const [translating, setTranslating]   = useState(false)
  const translatingRef                  = useRef(false)

  const getName = (item) =>
    item.name || item.testName || item.arabicName || item.ar_name || item.test_name || item.id

  const translateAll = async (list) => {
    if (translatingRef.current) return
    translatingRef.current = true
    setTranslating(true)
    const CHUNK = 8
    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK)
      await Promise.all(
        chunk.map(async (item) => {
          try {
            const ar = await translateText(getName(item))
            if (ar) setTranslations((prev) => ({ ...prev, [item.id]: ar }))
          } catch { /* skip */ }
        })
      )
    }
    setTranslating(false)
    translatingRef.current = false
  }

  useEffect(() => {
    getPriceList()
      .then((data) => { setItems(data); translateAll(data) })
      .catch(() => toast.error('حدث خطأ أثناء تحميل قائمة الفحوصات'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = search.trim()
    ? items.filter((item) => {
        const name = getName(item)?.toLowerCase()
        const ar   = translations[item.id]?.toLowerCase()
        const q    = search.toLowerCase()
        return name?.includes(q) || ar?.includes(q)
      })
    : items

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <FlaskConical className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">قائمة الفحوصات</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-gray-500">
                    {loading ? '...' : (
                      <>
                        <span className="font-semibold text-blue-600">{filtered.length}</span>
                        {search ? ` نتيجة من ${items.length}` : ' فحص متاح'}
                      </>
                    )}
                  </p>
                  {translating && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Languages className="h-3 w-3 animate-pulse" />
                      جاري الترجمة...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالعربي أو الإنجليزي..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-9 pl-8 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
            <TestTube className="mb-3 h-12 w-12 text-gray-200" />
            <p className="text-sm font-medium text-gray-400">
              {search ? `لا توجد نتائج لـ "${search}"` : 'لا توجد فحوصات'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-xs text-blue-600 hover:underline">
                عرض الكل
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((item, idx) => {
              const original = getName(item)
              const arabic   = translations[item.id]
              const showAr   = arabic && arabic !== original

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 hover:shadow"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-500">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-snug">{original}</p>
                    {showAr && (
                      <p className="text-xs text-gray-400 mt-0.5">{arabic}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default PriceList

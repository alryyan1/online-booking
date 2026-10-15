import { useEffect, useState } from 'react'
import {
  Search, X, FlaskConical, FileText, ExternalLink, Phone, Receipt, RefreshCw,
  ChevronRight, ChevronLeft, Settings, Plus, Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { getFacilityById } from '../../services/facilityService'
import {
  getLabResultsPage, getLabResultsCount, searchLabResults, getLabResultByReceipt, addLabResult,
} from '../../services/labService'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20
const ADD_EMPTY = { patientName: '', receiptNo: '', patientPhone: '', file: null }
const inputCls = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

const AddResultModal = ({ isOpen, onClose, collectionName, onAdded }) => {
  const [form, setForm]         = useState(ADD_EMPTY)
  const [saving, setSaving]     = useState(false)
  const [progress, setProgress] = useState(0)

  const close = () => { if (saving) return; setForm(ADD_EMPTY); setProgress(0); onClose() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const receiptNo = form.receiptNo.trim()
    if (!form.patientName.trim() || !receiptNo || !form.file) return toast.error('أكمل الحقول المطلوبة')
    if (receiptNo.includes('/')) return toast.error('رقم الإيصال لا يجب أن يحتوي على /')
    setSaving(true)
    try {
      if (await getLabResultByReceipt(collectionName, receiptNo)
        && !window.confirm(`توجد نتيجة مسجلة بالإيصال رقم ${receiptNo}. هل تريد استبدالها؟`)) {
        setSaving(false)
        return
      }
      await addLabResult(collectionName, { ...form, receiptNo }, setProgress)
      toast.success('تمت إضافة النتيجة')
      setSaving(false)
      setForm(ADD_EMPTY); setProgress(0)
      onAdded()
    } catch {
      toast.error('حدث خطأ أثناء إضافة النتيجة')
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="إضافة نتيجة" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-1" dir="rtl">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-700">اسم المريض *</span>
          <input value={form.patientName} onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700">رقم الإيصال *</span>
            <input value={form.receiptNo} onChange={(e) => setForm((f) => ({ ...f, receiptNo: e.target.value }))} dir="ltr" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700">رقم الهاتف</span>
            <input value={form.patientPhone} onChange={(e) => setForm((f) => ({ ...f, patientPhone: e.target.value }))} dir="ltr" placeholder="249..." className={inputCls} />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-700">ملف النتيجة *</span>
          <span className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 hover:border-blue-400 hover:bg-blue-50/40">
            <Upload className="h-4 w-4 shrink-0" />
            <span className="truncate">{form.file ? form.file.name : 'اختر ملف PDF'}</span>
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null
              if (file && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
                toast.error('يجب أن يكون الملف بصيغة PDF')
                e.target.value = ''
                return
              }
              setForm((f) => ({ ...f, file }))
            }}
          />
        </label>
        <p className="text-[11px] text-gray-400" dir="ltr">/{collectionName}/{form.receiptNo.trim() || '{receipt_no}'}</p>

        {saving && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={close} disabled={saving} className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60">
            إلغاء
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60">
            <Plus className="h-3.5 w-3.5" />{saving ? `جاري الرفع ${progress}%` : 'إضافة'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const formatDateTime = (ts) => {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null
  if (!d || isNaN(d)) return '—'
  return d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
}

const LabResults = () => {
  const { facilityId } = useAuth()
  const [collectionName, setCollectionName] = useState(null)
  const [results, setResults]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [total, setTotal]                   = useState(0)
  const [page, setPage]                     = useState(0)
  // cursors[i] = آخر مستند قبل الصفحة i (null للصفحة الأولى)
  const [cursors, setCursors]               = useState([null])
  const [search, setSearch]                 = useState('')
  const [searchResults, setSearchResults]   = useState(null)
  const [searching, setSearching]           = useState(false)
  const [addOpen, setAddOpen]               = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const loadPage = async (coll, pageIdx, cursorList) => {
    setLoading(true)
    try {
      const { results: rows, lastDoc } = await getLabResultsPage(coll, PAGE_SIZE, cursorList[pageIdx])
      setResults(rows)
      setPage(pageIdx)
      const next = [...cursorList]
      next[pageIdx + 1] = lastDoc
      setCursors(next)
    } catch {
      toast.error('حدث خطأ أثناء تحميل نتائج المختبر')
    } finally {
      setLoading(false)
    }
  }

  const reload = (coll) => {
    getLabResultsCount(coll).then(setTotal).catch(() => {})
    loadPage(coll, 0, [null])
  }

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    getFacilityById(facilityId)
      .then((f) => {
        const coll = f?.targetCollection?.trim()
        setCollectionName(coll || null)
        if (coll) reload(coll)
        else setLoading(false)
      })
      .catch(() => { toast.error('تعذر تحميل إعدادات المركز'); setLoading(false) })
  }, [facilityId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const term = search.trim()
    if (!term || !collectionName) return
    setSearching(true)
    try {
      setSearchResults(await searchLabResults(collectionName, term))
    } catch {
      toast.error('حدث خطأ أثناء البحث')
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => { setSearch(''); setSearchResults(null) }

  const isSearch = searchResults !== null
  const shown = isSearch ? searchResults : results

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
                <h1 className="text-lg font-bold text-gray-900">نتائج المختبر</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {loading ? '...' : isSearch ? (
                    <>
                      <span className="font-semibold text-blue-600">{searchResults.length}</span>
                      {` نتيجة بحث من ${total}`}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-blue-600">{total}</span>
                      {' نتيجة'}
                    </>
                  )}
                </p>
              </div>
            </div>

            {!loading && !collectionName && (
              <button
                disabled
                title="حدد اسم المجموعة في إعدادات المركز أولاً"
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white opacity-50 cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />إضافة نتيجة
              </button>
            )}

            {collectionName && (
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <button
                  onClick={() => setAddOpen(true)}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 transition"
                >
                  <Plus className="h-4 w-4" />إضافة نتيجة
                </button>
                <form onSubmit={handleSubmit} className="relative flex-1 sm:w-72">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); if (!e.target.value) setSearchResults(null) }}
                    placeholder="رقم الإيصال، الاسم أو الهاتف ثم Enter"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-9 pl-8 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                  {searching ? (
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2"><Spinner size="sm" /></span>
                  ) : search && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </form>
                <button
                  onClick={() => { clearSearch(); reload(collectionName) }}
                  disabled={loading}
                  title="تحديث"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                >
                  <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : !collectionName ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
            <FlaskConical className="mb-3 h-12 w-12 text-gray-200" />
            <p className="text-sm font-medium text-gray-400">لم يتم تحديد مجموعة نتائج المختبر لهذا المركز</p>
            <p className="mt-1 text-xs text-gray-400">يمكنك ضبطها من إعدادات المركز ← الإعدادات</p>
            {facilityId && (
              <Link
                to={`/admin/facilities/${facilityId}?tab=settings`}
                className="mt-4 flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                <Settings className="h-3.5 w-3.5" />
                الذهاب إلى إعدادات المركز
              </Link>
            )}
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
            <FileText className="mb-3 h-12 w-12 text-gray-200" />
            <p className="text-sm font-medium text-gray-400">
              {isSearch ? `لا توجد نتائج لـ "${search}"` : 'لا توجد نتائج'}
            </p>
            {isSearch && (
              <button onClick={clearSearch} className="mt-2 text-xs text-blue-600 hover:underline">
                عرض الكل
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {shown.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 hover:shadow"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">{r.patient_name || '—'}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Receipt className="h-3 w-3" />{r.id}</span>
                    {r.patient_phone && (
                      <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3 w-3" />{r.patient_phone}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-400">{formatDateTime(r.updated_at || r.created_at)}</p>
                </div>
                {r.result_url ? (
                  <a
                    href={r.result_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    عرض النتيجة
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-gray-400">لا يوجد ملف</span>
                )}
              </div>
            ))}
          </div>

          {/* ── Pagination ── */}
          {!isSearch && totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => loadPage(collectionName, page - 1, cursors)}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />السابق
              </button>
              <span className="text-xs text-gray-500">
                صفحة <span className="font-semibold text-gray-800">{page + 1}</span> من {totalPages}
              </span>
              <button
                onClick={() => loadPage(collectionName, page + 1, cursors)}
                disabled={page + 1 >= totalPages || !cursors[page + 1]}
                className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                التالي<ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {collectionName && (
        <AddResultModal
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          collectionName={collectionName}
          onAdded={() => { setAddOpen(false); clearSearch(); reload(collectionName) }}
        />
      )}
    </div>
  )
}

export default LabResults

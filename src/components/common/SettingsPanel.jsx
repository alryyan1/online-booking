import { useRef, useEffect, useState } from 'react'
import { Settings, Sun, Moon, Monitor } from 'lucide-react'
import { useSettings } from '../../contexts/SettingsContext'
import { cn } from '../../lib/utils'

const FONT_OPTIONS = [
  { key: 'sm', label: 'A', style: 'text-xs' },
  { key: 'md', label: 'A', style: 'text-sm' },
  { key: 'lg', label: 'A', style: 'text-base' },
]

export default function SettingsPanel() {
  const { darkMode, setDarkMode, fontSize, setFontSize } = useSettings()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-full transition-colors',
          open ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
        )}
        aria-label="الإعدادات"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-10 z-50 w-64 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
          dir="rtl"
        >
          {/* Header */}
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">إعدادات العرض</p>
          </div>

          <div className="p-4 flex flex-col gap-5">

            {/* Dark mode */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">السمة</p>
              <div className="flex gap-2">
                {[
                  { key: false, label: 'فاتح',  icon: Sun },
                  { key: true,  label: 'داكن',  icon: Moon },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={String(key)}
                    onClick={() => setDarkMode(key)}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1.5 rounded-lg border py-2.5 text-xs font-medium transition-colors',
                      darkMode === key
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-500'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">حجم الخط</p>
              <div className="flex gap-2">
                {FONT_OPTIONS.map(({ key, label, style }) => (
                  <button
                    key={key}
                    onClick={() => setFontSize(key)}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1 rounded-lg border py-2.5 font-bold transition-colors',
                      style,
                      fontSize === key
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-500'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                  >
                    {label}
                    <span className="text-[9px] font-normal">
                      {key === 'sm' ? 'صغير' : key === 'md' ? 'متوسط' : 'كبير'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

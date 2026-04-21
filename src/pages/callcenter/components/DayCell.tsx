import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Sun, Moon, Pencil, Check } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { type Doctor, type WorkingDay, updateDoctorInSpec } from '../../../services/facilityService'

export interface DayCellProps {
  doc: Doctor;
  specId: string;
  day: string;
  facilityId: string;
  onSaved: (docId: string, newSchedule: Record<string, WorkingDay | null>) => void;
}

interface ShiftEditorProps {
  icon: React.ReactNode;
  label: string;
  value: { enabled: boolean; start: string; end: string };
  onChange: (val: { enabled: boolean; start: string; end: string }) => void;
}

function ShiftEditor({ icon, label, value, onChange }: ShiftEditorProps) {
  return (
    <div className="mb-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
      <label className="mb-1.5 flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="h-3.5 w-3.5 rounded accent-blue-600"
        />
        {icon}
        <span className="text-[11px] font-semibold text-gray-700">{label}</span>
      </label>
    </div>
  )
}

export function DayCell({ doc, specId, day, facilityId, onSaved }: DayCellProps) {
  const ds = doc.workingSchedule?.[day]
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [morning, setMorning] = useState({
    enabled: !!ds?.morning,
    start: ds?.morning?.start || '08:00',
    end: ds?.morning?.end || '14:00',
  })
  const [evening, setEvening] = useState({
    enabled: !!ds?.evening,
    start: ds?.evening?.start || '16:00',
    end: ds?.evening?.end || '22:00',
  })
  const ref = useRef<HTMLTableCellElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { 
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    // Re-sync with latest doc data
    const cur = doc.workingSchedule?.[day]
  
    setMorning({ enabled: !!cur?.morning, start: cur?.morning?.start || '08:00', end: cur?.morning?.end || '14:00' })
    setEvening({ enabled: !!cur?.evening, start: cur?.evening?.start || '16:00', end: cur?.evening?.end || '22:00' })
    setOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const newDay: Partial<WorkingDay> = {}
      if (morning.enabled) newDay.morning = { start: morning.start, end: morning.end }
      if (evening.enabled) newDay.evening = { start: evening.start, end: evening.end }

      const newSchedule = { ...(doc.workingSchedule || {}), [day]: Object.keys(newDay).length ? newDay as WorkingDay : null }
      if (!Object.keys(newDay).length) delete newSchedule[day]

      await updateDoctorInSpec(facilityId, specId, doc.id, { workingSchedule: newSchedule })
      onSaved(doc.id, newSchedule as Record<string, WorkingDay | null>)
      toast.success('تم الحفظ')
      setOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const hasData = ds?.morning || ds?.evening

  return (
    <td className="relative px-1.5 py-1.5 text-center align-middle" ref={ref}>
      {/* Display */}
      <button
        onClick={handleOpen}
        className={cn(
          'group w-full min-w-21 rounded-md border px-1.5 py-1 text-left transition hover:border-blue-300 hover:bg-blue-50',
          hasData ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-transparent'
        )}
      >
        {hasData ? (
          <div className="space-y-0.5">
            {ds.morning && (
              <div className="flex items-center gap-0.5">
                <Sun className="h-2.5 w-2.5 shrink-0 text-amber-400" />
                <span className="text-[10px] font-medium text-gray-700" dir="ltr">
                  {ds.morning.start}–{ds.morning.end}
                </span>
              </div>
            )}
            {ds.evening && (
              <div className="flex items-center gap-0.5">
                <Moon className="h-2.5 w-2.5 shrink-0 text-indigo-400" />
                <span className="text-[10px] font-medium text-gray-700" dir="ltr">
                  {ds.evening.start}–{ds.evening.end}
                </span>
              </div>
            )}
          </div>
        ) : (
          <span className="flex items-center justify-center text-gray-300 group-hover:text-blue-400">
            <Pencil className="h-3 w-3" />
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute top-full left-1/2 z-5000 mt-1 w-56 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-2.5 text-center text-xs font-bold text-gray-700">{day}</p>

          {/* Morning */}
          <ShiftEditor
            icon={<Sun className="h-3.5 w-3.5 text-amber-400" />}
            label="صباحاً"
            value={morning}
            onChange={setMorning}
          />

          {/* Evening */}
          <ShiftEditor
            icon={<Moon className="h-3.5 w-3.5 text-indigo-400" />}
            label="مساءً"
            value={evening}
            onChange={setEvening}
          />

          {/* Actions */}
          <div className="mt-3 flex gap-1.5">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded-md border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
            >
              {saving
                ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <Check className="h-3 w-3" />}
              حفظ
            </button>
          </div>
        </div>
      )}
    </td>
  )
}

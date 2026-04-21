import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { User } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function ZoomableAvatar({ src, alt, size = 7, className }) {
  const [pos, setPos] = useState(null)
  const thumbRef = useRef(null)

  const handleMouseEnter = () => {
    if (!src || !thumbRef.current) return
    const r = thumbRef.current.getBoundingClientRect()
    setPos({
      top: r.top + window.scrollY,
      left: r.left + r.width / 2 + window.scrollX,
    })
  }

  const handleMouseLeave = () => setPos(null)

  return (
    <div
      ref={thumbRef}
      className="relative shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail */}
      <div className={cn(`flex h-${size} w-${size} items-center justify-center rounded-full bg-blue-50 overflow-hidden ring-1 ring-blue-100`, className)}>
        {src
          ? <img src={src} alt={alt} className="h-full w-full object-cover" />
          : <User className="h-3.5 w-3.5 text-blue-400" />}
      </div>

      {/* Portal popup — escapes all overflow contexts */}
      {src && pos && createPortal(
        <div
          className="pointer-events-none"
          style={{
            position: 'absolute',
            top: pos.top - 8,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
        >
          <div className="animate-in fade-in zoom-in-95 duration-150 origin-bottom rounded-xl overflow-hidden shadow-2xl ring-2 ring-white border border-gray-200 bg-white">
            <img src={src} alt={alt} className="h-36 w-36 object-contain block bg-gray-50" />
            {alt && (
              <p className="text-center text-[11px] font-semibold text-gray-700 px-2 py-1.5 bg-white truncate max-w-36">
                {alt}
              </p>
            )}
          </div>
          {/* Arrow */}
          <div className="mx-auto w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white" style={{ filter: 'drop-shadow(0 1px 0 #e5e7eb)' }} />
        </div>,
        document.body
      )}
    </div>
  )
}

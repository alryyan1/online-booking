import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = ({ className, ...props }) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
)

const DialogContent = ({ className, children, onClose, ...props }) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-2xl',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'w-[calc(100vw-2rem)]',
        className
      )}
      {...props}
    >
      {children}
      {onClose && (
        <DialogPrimitive.Close
          onClick={onClose}
          className="absolute left-4 top-3.5 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
)

const DialogHeader = ({ className, ...props }) => (
  <div className={cn('flex items-center justify-between border-b border-gray-100 px-5 py-3.5', className)} {...props} />
)

const DialogTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title className={cn('text-sm font-semibold text-gray-900', className)} {...props} />
)

const DialogBody = ({ className, ...props }) => (
  <div className={cn('overflow-y-auto px-5 py-4', className)} {...props} />
)

export { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogContent, DialogClose, DialogHeader, DialogTitle, DialogBody }

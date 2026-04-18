import MuiDialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { useEffect } from 'react'

const sizeMap = { sm: 'xs', md: 'sm', lg: 'md', xl: 'lg', '2xl': 'xl' }

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {

  return (
    <MuiDialog
      open={!!isOpen}
      onClose={onClose}
      maxWidth={sizeMap[size] ?? 'sm'}
      fullWidth
      scroll="paper"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        {title}
        <IconButton onClick={onClose} size="small" edge="end" aria-label="إغلاق">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {children}
      </DialogContent>
    </MuiDialog>
  )
}

export default Modal

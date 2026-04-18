import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'

import Stack from '@mui/material/Stack'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const NAV_LINKS = [
  { label: 'حجز اليوم',     to: '/callcenter/book-today' },
  { label: 'حجز موعد',      to: '/callcenter/book' },
  { label: 'الحجوزات',      to: '/callcenter/appointments' },
  { label: 'جدول الأطباء',  to: '/callcenter/schedule' },
  { label: 'إدارة النظام',  to: '/superadmin' },
]

const Navbar = () => {
  const { currentUser, facilityName, logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
      toast.success('تم تسجيل الخروج بنجاح')
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الخروج')
    }
  }

  const navLinks = currentUser ? NAV_LINKS : [{ label: 'تسجيل الدخول', to: '/login' }]

  const drawer = (
    <Box sx={{ width: 260 }} role="presentation" onClick={() => setDrawerOpen(false)}>
      <Box sx={{ px: 2, py: 2 }}>
        <Box component="img" src="/logo.png" alt="logo" sx={{ height: 36, objectFit: 'contain', mb: currentUser ? 1.5 : 0 }} />
        {currentUser && (
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontWeight: 700 }}>
              {(currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600} noWrap>
                {currentUser.displayName || currentUser.email || '—'}
              </Typography>
              {facilityName && (
                <Typography variant="caption" color="primary.main" display="block">{facilityName}</Typography>
              )}
            </Box>
          </Stack>
        )}
      </Box>
      <Divider />
      <List>
        {navLinks.map((link) => (
          <ListItem key={link.to} disablePadding>
            <ListItemButton component={Link} to={link.to}>
              <ListItemText primary={link.label} />
            </ListItemButton>
          </ListItem>
        ))}

        {currentUser && (
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemText primary="تسجيل الخروج" primaryTypographyProps={{ color: 'error' }} />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  )

  return (
    <>
      <AppBar position="sticky" color="inherit" elevation={1} sx={{ bgcolor: 'white', zIndex: 1200 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Logo */}
          <Button component={Link} to={currentUser ? '/callcenter/book-today' : '/login'} sx={{ p: 0.5, minWidth: 0 }}>
            <Box component="img" src="/logo.png" alt="logo" sx={{ height: 40, objectFit: 'contain' }} />
          </Button>

          {/* Desktop links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            {navLinks.map((link) => (
              <Button key={link.to} component={Link} to={link.to} color="inherit" sx={{ fontWeight: 500 }}>
                {link.label}
              </Button>
            ))}

            {currentUser && (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" fontWeight={600} noWrap display="block" sx={{ maxWidth: 180 }}>
                    {currentUser.displayName || currentUser.email || '—'}
                  </Typography>
                  {facilityName && (
                    <Typography variant="caption" color="primary.main" noWrap display="block" sx={{ fontSize: '0.68rem', maxWidth: 180 }}>
                      {facilityName}
                    </Typography>
                  )}
                </Box>
                <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}>
                  {(currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
                </Avatar>
                <Button onClick={handleLogout} variant="outlined" color="error" size="small">
                  خروج
                </Button>
              </Stack>
            )}
          </Box>

          {/* Mobile menu button */}
          <IconButton
            sx={{ display: { md: 'none' } }}
            onClick={() => setDrawerOpen(true)}
            aria-label="القائمة"
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {drawer}
      </Drawer>
    </>
  )
}

export default Navbar

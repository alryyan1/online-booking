import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu, LogOut, CalendarDays, CalendarCheck, ClipboardList,
  LayoutDashboard, ChevronDown, BarChart2, Settings,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '../ui/sheet'
import { cn } from '../../lib/utils'
import NotificationBell from './NotificationBell'
import SettingsPanel from './SettingsPanel'
import toast from 'react-hot-toast'

const NAV_LINKS = [
  { label: 'حجز اليوم',     to: '/callcenter/book-today',   icon: CalendarDays },
  { label: 'حجز موعد',      to: '/callcenter/book',          icon: CalendarCheck },
  { label: 'الحجوزات',      to: '/callcenter/appointments',  icon: ClipboardList },
  { label: 'جدول الأطباء',  to: '/callcenter/schedule',      icon: CalendarDays },
  { label: 'الإحصائيات',   to: '/callcenter/statistics',    icon: BarChart2 },
  { label: 'إدارة النظام',  to: '/superadmin',               icon: LayoutDashboard, role: 'superadmin' },
]

export default function Navbar() {
  const { currentUser, userRole, facilityId, facilityName, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
      toast.success('تم تسجيل الخروج بنجاح')
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الخروج')
    }
  }

  const initials = (currentUser?.displayName || currentUser?.email || '?')
    .slice(0, 2)
    .toUpperCase()

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + '/')

  const visibleLinks = NAV_LINKS.filter(({ role }) => !role || role === userRole)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80 dark:border-gray-700 dark:bg-gray-900/95">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">

        {/* Logo */}
        <Link to="/callcenter/book-today" className="flex shrink-0 items-center">
          <img src="/logo.png" alt="logo" className="h-8 object-contain" />
        </Link>

        {/* Desktop nav — RTL so links read right-to-left */}
        <nav className="hidden md:flex items-center gap-1 flex-1" dir="rtl">
          {visibleLinks.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive(to)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Spacer on mobile */}
        <div className="flex-1 md:hidden" />

        {/* Notification bell */}
        <NotificationBell facilityId={facilityId} />

        {/* Settings */}
        <SettingsPanel />

        {/* User dropdown */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-right leading-tight">
                  <p className="text-xs font-semibold text-gray-900 max-w-35 truncate">
                    {currentUser.displayName || currentUser.email}
                  </p>
                  {facilityName && (
                    <p className="text-[10px] text-blue-600 max-w-35 truncate">{facilityName}</p>
                  )}
                </div>
                <ChevronDown className="hidden md:block h-3.5 w-3.5 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" dir="rtl">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{currentUser.displayName || '—'}</p>
                    {userRole && (
                      <span className="shrink-0 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                        {userRole}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                  {facilityName && (
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-blue-600 truncate">{facilityName}</p>
                      {facilityId && (
                        <Link
                          to={`/superadmin/facilities/${facilityId}`}
                          className="text-gray-400 hover:text-blue-600 transition-colors shrink-0 mr-1"
                          title="إعدادات المنشأة"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer gap-2"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Mobile hamburger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
              <Menu className="h-4 w-4" />
              <span className="sr-only">القائمة</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0" dir="rtl">
            <SheetHeader className="border-b border-gray-100 px-4 py-4">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="logo" className="h-8 object-contain" />
                {currentUser && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {currentUser.displayName || currentUser.email}
                    </p>
                    {facilityName && (
                      <p className="text-xs text-blue-600 truncate">{facilityName}</p>
                    )}
                  </div>
                )}
              </div>
              <SheetTitle className="sr-only">القائمة</SheetTitle>
            </SheetHeader>

            <nav className="flex flex-col gap-1 p-3">
              {visibleLinks.map(({ label, to, icon: Icon }) => (
                <SheetClose key={to} asChild>
                  <Link
                    to={to}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive(to)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </SheetClose>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </div>
          </SheetContent>
        </Sheet>

      </div>
    </header>
  )
}

import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/entry',      icon: '📝', label: 'إدخال يومي' },
  { to: '/log',        icon: '📅', label: 'السجل اليومي' },
  { to: '/settlement', icon: '🧾', label: 'التسوية' },
  { to: '/prices',     icon: '🏷️', label: 'الأسعار' },
]

export default function DashboardLayout() {
  const { user, branch, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
    toast.success('تم تسجيل الخروج')
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 bg-white border-l border-slate-200 flex-col fixed h-full shadow-sm z-30">
        <div className="p-5 border-b border-slate-100">
          <div className="text-xl font-bold text-slate-800">🧺 المغسلة</div>
          <div className="text-xs text-blue-600 font-medium mt-1 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
            {branch || 'الفرع الرئيسي'}
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="text-xs text-slate-400 px-3 pb-2 truncate">{user?.email}</div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <span>🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between px-4 h-14">
        <div className="text-base font-bold text-slate-800">🧺 المغسلة</div>
        <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-full">
          {branch || 'الفرع الرئيسي'}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="md:mr-60 p-4 md:p-6 pt-[4.5rem] md:pt-6 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex items-stretch justify-around h-16">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 text-xs font-medium transition-colors ${
                isActive ? 'text-blue-600' : 'text-slate-500'
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 text-xs font-medium text-red-500"
        >
          <span className="text-lg leading-none">🚪</span>
          <span>خروج</span>
        </button>
      </nav>

    </div>
  )
}

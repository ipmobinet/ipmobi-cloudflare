import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Globe,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/proxy', label: 'Proxy IPs', icon: Globe },
  { to: '/usage', label: 'Usage', icon: BarChart3 },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">IPMOBI</h1>
          <span className="logo-sub">Customer Dashboard</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item--active' : ''}`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item logout-btn">
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

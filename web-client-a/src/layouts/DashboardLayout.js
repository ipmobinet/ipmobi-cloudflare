import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Globe, BarChart3, CreditCard, Settings, LogOut, } from 'lucide-react';
const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/proxy', label: 'Proxy IPs', icon: Globe },
    { to: '/usage', label: 'Usage', icon: BarChart3 },
    { to: '/billing', label: 'Billing', icon: CreditCard },
    { to: '/settings', label: 'Settings', icon: Settings },
];
export default function DashboardLayout() {
    return (_jsxs("div", { className: "dashboard-layout", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "sidebar-header", children: [_jsx("h1", { className: "logo", children: "IPMOBI" }), _jsx("span", { className: "logo-sub", children: "Customer Dashboard" })] }), _jsx("nav", { className: "sidebar-nav", children: navItems.map(({ to, label, icon: Icon }) => (_jsxs(NavLink, { to: to, end: to === '/', className: ({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`, children: [_jsx(Icon, { size: 20 }), _jsx("span", { children: label })] }, to))) }), _jsx("div", { className: "sidebar-footer", children: _jsxs("button", { className: "nav-item logout-btn", children: [_jsx(LogOut, { size: 20 }), _jsx("span", { children: "Log Out" })] }) })] }), _jsx("main", { className: "main-content", children: _jsx(Outlet, {}) })] }));
}

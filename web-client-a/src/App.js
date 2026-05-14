import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import ProxyPage from './pages/ProxyPage';
import UsagePage from './pages/UsagePage';
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';
export default function App() {
    return (_jsx(Routes, { children: _jsxs(Route, { element: _jsx(DashboardLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(OverviewPage, {}) }), _jsx(Route, { path: "/proxy", element: _jsx(ProxyPage, {}) }), _jsx(Route, { path: "/usage", element: _jsx(UsagePage, {}) }), _jsx(Route, { path: "/billing", element: _jsx(BillingPage, {}) }), _jsx(Route, { path: "/settings", element: _jsx(SettingsPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}

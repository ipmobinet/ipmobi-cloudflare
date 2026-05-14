import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { Activity, Users, Globe, DollarSign } from 'lucide-react';
const API_BASE = '/api/v1';
function StatCard({ title, value, icon: Icon, trend }) {
    return (_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-card__icon", children: _jsx(Icon, { size: 24 }) }), _jsxs("div", { className: "stat-card__body", children: [_jsx("p", { className: "stat-card__title", children: title }), _jsx("p", { className: "stat-card__value", children: value }), trend && _jsx("p", { className: "stat-card__trend", children: trend })] })] }));
}
export default function OverviewPage() {
    const { data: health } = useQuery({
        queryKey: ['health'],
        queryFn: () => fetch(`${API_BASE}/health`).then(r => r.json()),
    });
    const { data: stats } = useQuery({
        queryKey: ['proxy-stats'],
        queryFn: () => fetch(`${API_BASE}/proxy/stats`).then(r => r.json()),
    });
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page-header", children: [_jsx("h2", { children: "Overview" }), _jsxs("p", { className: "page-subtitle", children: ["API Status: ", health?.status === 'ok' ? '✅ Connected' : '⏳ Loading...'] })] }), _jsxs("div", { className: "stats-grid", children: [_jsx(StatCard, { title: "Active Proxies", value: stats?.activeProxies ?? '—', icon: Globe }), _jsx(StatCard, { title: "Total Bandwidth", value: stats?.totalBandwidth ?? '—', icon: Activity }), _jsx(StatCard, { title: "Active Users", value: stats?.activeUsers ?? '—', icon: Users }), _jsx(StatCard, { title: "Monthly Spend", value: "$0.00", icon: DollarSign, trend: "+0% this month" })] }), _jsxs("section", { className: "section", children: [_jsx("h3", { children: "Quick Actions" }), _jsxs("div", { className: "quick-actions", children: [_jsx("button", { className: "btn btn--primary", children: "Assign New Proxy" }), _jsx("button", { className: "btn btn--secondary", children: "View Usage Report" }), _jsx("button", { className: "btn btn--secondary", children: "Top Up Balance" })] })] })] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Search, Plus, Copy, RefreshCw } from 'lucide-react';
const mockProxies = [
    {
        id: 'px_1',
        ip: '192.168.1.100',
        port: 3128,
        country: 'US',
        status: 'active',
        assignedAt: '2026-05-14T10:00:00Z',
        expiresAt: '2026-05-15T10:00:00Z',
    },
    {
        id: 'px_2',
        ip: '192.168.1.101',
        port: 3128,
        country: 'MY',
        status: 'active',
        assignedAt: '2026-05-13T08:00:00Z',
        expiresAt: '2026-05-16T08:00:00Z',
    },
];
export default function ProxyPage() {
    const [search, setSearch] = useState('');
    const filtered = mockProxies.filter((p) => p.ip.includes(search) || p.country.toLowerCase().includes(search.toLowerCase()));
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page-header", children: [_jsx("h2", { children: "Proxy IPs" }), _jsx("div", { className: "page-header__actions", children: _jsxs("button", { className: "btn btn--primary", children: [_jsx(Plus, { size: 18 }), " Assign New"] }) })] }), _jsxs("div", { className: "search-bar", children: [_jsx(Search, { size: 18 }), _jsx("input", { type: "text", placeholder: "Search by IP or country...", value: search, onChange: (e) => setSearch(e.target.value) })] }), _jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "IP Address" }), _jsx("th", { children: "Port" }), _jsx("th", { children: "Country" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Expires" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: filtered.map((proxy) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("code", { children: proxy.ip }) }), _jsx("td", { children: proxy.port }), _jsx("td", { children: proxy.country }), _jsx("td", { children: _jsx("span", { className: `badge badge--${proxy.status}`, children: proxy.status }) }), _jsx("td", { children: new Date(proxy.expiresAt).toLocaleDateString() }), _jsxs("td", { className: "actions-cell", children: [_jsx("button", { className: "btn-icon", title: "Copy credentials", children: _jsx(Copy, { size: 16 }) }), _jsx("button", { className: "btn-icon", title: "Rotate IP", children: _jsx(RefreshCw, { size: 16 }) })] })] }, proxy.id))) })] })] }));
}

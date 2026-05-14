import { useState } from 'react'
import { Search, Plus, Copy, RefreshCw } from 'lucide-react'

type Proxy = {
  id: string
  ip: string
  port: number
  country: string
  status: 'active' | 'expired' | 'suspended'
  assignedAt: string
  expiresAt: string
}

const mockProxies: Proxy[] = [
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
]

export default function ProxyPage() {
  const [search, setSearch] = useState('')

  const filtered = mockProxies.filter((p) =>
    p.ip.includes(search) || p.country.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="page">
      <header className="page-header">
        <h2>Proxy IPs</h2>
        <div className="page-header__actions">
          <button className="btn btn--primary">
            <Plus size={18} /> Assign New
          </button>
        </div>
      </header>

      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search by IP or country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>IP Address</th>
            <th>Port</th>
            <th>Country</th>
            <th>Status</th>
            <th>Expires</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((proxy) => (
            <tr key={proxy.id}>
              <td><code>{proxy.ip}</code></td>
              <td>{proxy.port}</td>
              <td>{proxy.country}</td>
              <td>
                <span className={`badge badge--${proxy.status}`}>
                  {proxy.status}
                </span>
              </td>
              <td>{new Date(proxy.expiresAt).toLocaleDateString()}</td>
              <td className="actions-cell">
                <button className="btn-icon" title="Copy credentials">
                  <Copy size={16} />
                </button>
                <button className="btn-icon" title="Rotate IP">
                  <RefreshCw size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

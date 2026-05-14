import { useQuery } from '@tanstack/react-query'
import { Activity, Users, Globe, DollarSign } from 'lucide-react'

const API_BASE = '/api/v1'

function StatCard({ title, value, icon: Icon, trend }: {
  title: string; value: string; icon: any; trend?: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon"><Icon size={24} /></div>
      <div className="stat-card__body">
        <p className="stat-card__title">{title}</p>
        <p className="stat-card__value">{value}</p>
        {trend && <p className="stat-card__trend">{trend}</p>}
      </div>
    </div>
  )
}

export default function OverviewPage() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetch(`${API_BASE}/health`).then(r => r.json()),
  })

  const { data: stats } = useQuery({
    queryKey: ['proxy-stats'],
    queryFn: () => fetch(`${API_BASE}/proxy/stats`).then(r => r.json()),
  })

  return (
    <div className="page">
      <header className="page-header">
        <h2>Overview</h2>
        <p className="page-subtitle">
          API Status: {health?.status === 'ok' ? '✅ Connected' : '⏳ Loading...'}
        </p>
      </header>

      <div className="stats-grid">
        <StatCard
          title="Active Proxies"
          value={stats?.activeProxies ?? '—'}
          icon={Globe}
        />
        <StatCard
          title="Total Bandwidth"
          value={stats?.totalBandwidth ?? '—'}
          icon={Activity}
        />
        <StatCard
          title="Active Users"
          value={stats?.activeUsers ?? '—'}
          icon={Users}
        />
        <StatCard
          title="Monthly Spend"
          value="$0.00"
          icon={DollarSign}
          trend="+0% this month"
        />
      </div>

      <section className="section">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <button className="btn btn--primary">Assign New Proxy</button>
          <button className="btn btn--secondary">View Usage Report</button>
          <button className="btn btn--secondary">Top Up Balance</button>
        </div>
      </section>
    </div>
  )
}

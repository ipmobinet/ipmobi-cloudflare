import { Server, Activity, Users, Clock } from 'lucide-react'

function MetricCard({ title, value, icon: Icon, sub }: {
  title: string; value: string; icon: any; sub?: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon"><Icon size={24} /></div>
      <div className="stat-card__body">
        <p className="stat-card__title">{title}</p>
        <p className="stat-card__value">{value}</p>
        {sub && <p className="stat-card__trend">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Portal Dashboard</h2>
          <p className="page-subtitle">Monitor your proxy infrastructure</p>
        </div>
      </header>

      <div className="stats-grid">
        <MetricCard title="Active Nodes" value="12" icon={Server} sub="All online" />
        <MetricCard title="Requests (24h)" value="1.2M" icon={Activity} sub="+8.3% vs yesterday" />
        <MetricCard title="Connected Users" value="47" icon={Users} sub="Peak: 63" />
        <MetricCard title="Avg Response Time" value="42ms" icon={Clock} sub="-5ms from last week" />
      </div>

      <section className="section">
        <h3>Quick Start</h3>
        <div className="code-block">
          <p className="code-label">cURL — Test your proxy:</p>
          <pre>curl -x http://your-proxy-ip:3128 \
  -U "username:password" \
  https://httpbin.org/ip</pre>
        </div>
      </section>
    </div>
  )
}

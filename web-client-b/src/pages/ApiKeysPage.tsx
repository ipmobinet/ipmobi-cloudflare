import { useState } from 'react'
import { Plus, Copy, Eye, EyeOff } from 'lucide-react'

type ApiKey = {
  id: string
  name: string
  key: string
  created: string
  lastUsed: string
}

const mockKeys: ApiKey[] = [
  { id: 'ak_1', name: 'Production', key: 'ipmobi_pk_live_xxxx...xxxx', created: '2026-04-01', lastUsed: '2026-05-14' },
  { id: 'ak_2', name: 'Development', key: 'ipmobi_pk_test_xxxx...xxxx', created: '2026-04-15', lastUsed: '2026-05-13' },
]

export default function ApiKeysPage() {
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setVisible((v) => ({ ...v, [id]: !v[id] }))

  return (
    <div className="page">
      <header className="page-header">
        <h2>API Keys</h2>
        <button className="btn btn--primary">
          <Plus size={18} /> Generate Key
        </button>
      </header>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Key</th>
            <th>Created</th>
            <th>Last Used</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {mockKeys.map((k) => (
            <tr key={k.id}>
              <td>{k.name}</td>
              <td>
                <code>{visible[k.id] ? k.key : k.key.slice(0, 20) + '...'}</code>
                <button className="btn-icon" onClick={() => toggle(k.id)}>
                  {visible[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </td>
              <td>{k.created}</td>
              <td>{k.lastUsed}</td>
              <td>
                <button className="btn-icon" title="Copy"><Copy size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

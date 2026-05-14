export default function EndpointsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h2>Endpoints</h2>
        <p className="page-subtitle">Global proxy gateway endpoints</p>
      </header>
      <table className="table">
        <thead>
          <tr>
            <th>Region</th>
            <th>Address</th>
            <th>Port</th>
            <th>Protocol</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>🇺🇸 US West</td>
            <td><code>us-west.proxy.ipmobi.net</code></td>
            <td>3128</td>
            <td>HTTP/S</td>
            <td><span className="badge badge--active">active</span></td>
          </tr>
          <tr>
            <td>🇲🇾 Malaysia</td>
            <td><code>my.proxy.ipmobi.net</code></td>
            <td>3128</td>
            <td>HTTP/S</td>
            <td><span className="badge badge--active">active</span></td>
          </tr>
          <tr>
            <td>🇸🇬 Singapore</td>
            <td><code>sg.proxy.ipmobi.net</code></td>
            <td>3128</td>
            <td>HTTP/S</td>
            <td><span className="badge badge--active">active</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

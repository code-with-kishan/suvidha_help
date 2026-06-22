import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const cardStyles = [
  'ui-tone-blue',
  'ui-tone-green',
  'ui-tone-pink',
  'ui-tone-red',
  'ui-tone-yellow'
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    (async () => {
      const [dashboardRes, healthRes, logsRes] = await Promise.all([
        api.get('/api/admin/dashboard'),
        api.get('/api/admin/health'),
        api.get('/api/admin/audit-logs?limit=8')
      ]);

      setStats(dashboardRes.data);
      setHealth(healthRes.data);
      setAuditLogs(logsRes.data || []);
    })();
  }, []);

  return (
    <Layout title="Resolution Hub Analytics">
      <div className="hero-strip mb-5 p-5">
        <p className="ui-hand-label mb-3 inline-block">ops overview</p>
        <h2 className="text-2xl font-bold">Community Resolution Command Center</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-200">
          Real-time insights for reported issues, escalations, evidence flow, user participation, and support payments.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {stats &&
          Object.entries(stats).map(([key, value], index) => (
            <div
              key={key}
              className={`ui-metric-card ui-grid-pattern ${cardStyles[index % cardStyles.length]} text-center`}
            >
              <div className="relative z-10">
                <p className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className="ui-metric-value mt-2">{value}</p>
              </div>
            </div>
          ))}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Link
          className="dashboard-card ui-tone-blue p-4 text-center font-semibold"
          to="/admin/requests"
        >
          Issue Reports
        </Link>
        <Link
          className="dashboard-card ui-tone-red p-4 text-center font-semibold"
          to="/admin/complaints"
        >
          Escalations
        </Link>
        <Link
          className="dashboard-card ui-tone-green p-4 text-center font-semibold"
          to="/admin/users"
        >
          Users Management
        </Link>
        <Link
          className="dashboard-card ui-tone-yellow p-4 text-center font-semibold"
          to="/admin/reports"
        >
          Impact Dashboards
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="panel-card p-5">
          <p className="ui-hand-label mb-3 inline-block">health log</p>
          <h3 className="text-lg font-semibold text-primary">System Health</h3>
          {!health && <p className="mt-2 text-sm text-slate-600">Loading health metrics...</p>}
          {health && (
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>Uptime (seconds): {health.uptimeSeconds}</p>
              <p>Environment: {health.environment}</p>
              <p>
                Devices Online/Offline: {health.kiosks?.online || 0}/{health.kiosks?.offline || 0}
              </p>
              <p>Recent Audit Actions (24h): {health.recentAuditActions}</p>
              <p>Failed Payments: {health.failedPayments}</p>
            </div>
          )}
        </section>

        <section className="panel-card p-5">
          <p className="ui-hand-label mb-3 inline-block">audit trail</p>
          <h3 className="text-lg font-semibold text-primary">Recent Audit Logs</h3>
          {!auditLogs.length && <p className="mt-2 text-sm text-slate-600">No recent logs.</p>}
          {!!auditLogs.length && (
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {auditLogs.map((log) => (
                <div key={log.id} className="ui-soft-card ui-tone-blue p-3">
                  <p className="font-semibold">{log.action}</p>
                  <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</p>
                  <p className="text-xs text-slate-600">
                    Actor: {log.user?.name || 'System'} {log.user?.role ? `(${log.user.role})` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

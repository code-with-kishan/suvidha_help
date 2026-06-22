import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function ReportsPage() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/api/admin/dashboard');
      setDashboard(data);
    })();
  }, []);

  return (
    <Layout title="Impact Dashboards">
      <div className="hero-strip mb-4 p-5">
        <p className="ui-hand-label mb-3 inline-block">insight wall</p>
        <h2 className="text-2xl font-bold">Impact Dashboards</h2>
        <p className="mt-1 text-sm text-slate-100">Track the speed, scale, and visibility of hyperlocal issue resolution across the community.</p>
      </div>
      <div className="panel-card panel-card-hover p-6">
        <h2 className="mb-3 text-xl font-semibold">Community Impact Snapshot</h2>
        {!dashboard && <p>Loading...</p>}
        {dashboard && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Total Users: {dashboard.totalUsers}</li>
            <li>Total Requests: {dashboard.totalRequests}</li>
            <li>Pending Requests: {dashboard.pendingRequests}</li>
            <li>Total Complaints: {dashboard.totalComplaints}</li>
            <li>Successful Payments: {dashboard.successfulPayments}</li>
          </ul>
        )}
      </div>
    </Layout>
  );
}

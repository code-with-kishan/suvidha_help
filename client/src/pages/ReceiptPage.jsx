import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function ReceiptPage() {
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/admin/requests');
        setPayments(data || []);
      } catch (_error) {
        setMessage('Use admin reports for centralized receipts.');
      }
    })();
  }, []);

  return (
    <Layout title="Receipts & Resolution Records">
      <div className="hero-strip mb-4 p-5">
        <p className="ui-hand-label mb-3 inline-block">paper trail</p>
        <h2 className="text-2xl font-bold">Receipts & Resolution Records</h2>
        <p className="mt-1 text-sm text-slate-100">Review recent payment records and keep a transparent paper trail for local action workflows.</p>
      </div>
      <div className="panel-card panel-card-hover p-6">
        <p className="mb-4 text-sm text-slate-600">
          Latest transactional records can be printed from admin reports and payment success responses.
        </p>
        {message && <p className="ui-note p-3 text-sm">{message}</p>}
        <div className="space-y-2 text-sm">
          {payments.slice(0, 8).map((item) => (
            <div key={item.id} className="ui-soft-card ui-tone-blue p-3">
              Request #{item.id} - {item.serviceType} - {item.status}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

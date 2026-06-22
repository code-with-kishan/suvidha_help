import { useState } from 'react';
import Layout from '../components/Layout';
import KioskButton from '../components/KioskButton';
import api from '../services/api';

export default function StatusTrackingPage() {
  const [requestId, setRequestId] = useState('');
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');

  const track = async () => {
    try {
      const { data } = await api.get(`/api/services/application-status/${requestId}`);
      setResult(data);
      setMessage('Status fetched successfully');
    } catch (error) {
      setResult(null);
      setMessage(error.response?.data?.message || 'Unable to fetch status');
    }
  };

  return (
    <Layout title="Track Community Issue Status">
      <div className="hero-strip mb-4 p-5">
        <p className="ui-hand-label mb-3 inline-block">live lookup</p>
        <h2 className="text-2xl font-bold">Track Community Issue Status</h2>
        <p className="mt-1 text-sm text-slate-100">Enter your reference ID to follow a reported issue or escalation from submission to resolution.</p>
      </div>
      <div className="panel-card panel-card-hover mx-auto max-w-2xl p-6">
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border p-3 text-lg"
            placeholder="Enter your issue reference ID"
            type="text"
            inputMode="numeric"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
          />
          <KioskButton onClick={track}>Track Issue</KioskButton>
          {message && <p className="ui-note p-3 text-sm">{message}</p>}
          {result && (
            <div className="ui-result-card p-4 text-sm">
              <p><strong>Application Type:</strong> {result.applicationType}</p>
              <p><strong>Reference ID:</strong> {result.referenceCode || result.id}</p>
              <p><strong>Category:</strong> {result.category}</p>
              <p><strong>Status:</strong> <span className="status-chip">{result.status}</span></p>
              <p><strong>Description:</strong> {result.description}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

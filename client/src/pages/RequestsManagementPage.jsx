import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api, { getApiBaseUrl } from '../services/api';

const statuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

export default function RequestsManagementPage() {
  const [requests, setRequests] = useState([]);

  const resolveDocUrl = (url) => {
    if (!url) return '#';
    const apiBase = String(getApiBaseUrl()).replace(/\/$/, '');
    return url.replace(/^http:\/\/localhost:5000/i, apiBase);
  };

  const load = async () => {
    const { data } = await api.get('/api/admin/requests');
    setRequests(data);
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (id, status) => {
    await api.put(`/api/admin/update-status/${id}`, { type: 'service', status });
    await load();
  };

  const closeItem = async (id) => {
    const ok = window.confirm('Close this issue report and delete it permanently?');
    if (!ok) return;
    await api.delete(`/api/admin/close/${id}`, { data: { type: 'service' } });
    await load();
  };

  return (
    <Layout title="Issue Reports Management">
      <div className="hero-strip mb-4 p-5">
        <p className="ui-hand-label mb-3 inline-block">request board</p>
        <h2 className="text-2xl font-bold">Issue Reports Management</h2>
        <p className="mt-1 text-sm text-slate-100">Monitor issue reports, update statuses, and keep local resolution work transparent.</p>
      </div>
      <div className="space-y-3">
        {requests.map((item) => (
          <div key={item.id} className="panel-card panel-card-hover p-4">
            <p className="font-semibold">Ref #{item.referenceCode || item.id} - {item.serviceType}</p>
            <p className="text-sm">Reporter: {item.user?.mobile}</p>
            <p className="mt-1 text-sm text-slate-700"><strong>Description:</strong> {item.description}</p>
            {!!item.user?.documents?.length && (
              <div className="ui-soft-card ui-tone-blue mt-2 p-2 text-xs text-slate-700">
                <p className="font-semibold">User Documents</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {item.user.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={resolveDocUrl(doc.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="ui-chip-button px-2 py-1 font-medium"
                    >
                      {doc.docType}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm">Current: <span className="status-chip">{item.status}</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  className="ui-chip-button"
                  onClick={() => update(item.id, status)}
                >
                  {status}
                </button>
              ))}
              {(item.status === 'RESOLVED' || item.status === 'REJECTED') && (
                <button
                  className="ui-chip-button ui-chip-danger"
                  onClick={() => closeItem(item.id)}
                >
                  Close & Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

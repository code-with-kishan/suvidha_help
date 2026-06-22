import { useState } from 'react';
import Layout from '../components/Layout';
import KioskButton from '../components/KioskButton';
import api from '../services/api';

export default function UploadDocumentsPage() {
  const [docType, setDocType] = useState('ID_PROOF');
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');

  const upload = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    formData.append('consent', String(consent));

    try {
      const { data } = await api.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(`Uploaded: ${data.fileUrl}`);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Upload failed');
    }
  };

  return (
    <Layout title="Upload Issue Evidence">
      <div className="hero-strip mb-4 p-5">
        <p className="ui-hand-label mb-3 inline-block">document desk</p>
        <h2 className="text-2xl font-bold">Upload Issue Evidence</h2>
        <p className="mt-1 text-sm text-slate-100">Add photos, videos, scans, or supporting files that help validate and resolve local problems faster.</p>
      </div>
      <div className="panel-card panel-card-hover mx-auto max-w-2xl p-6">
        <div className="space-y-3">
          <select
            className="w-full rounded-lg border p-3 text-lg"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            <option value="ISSUE_PHOTO">Issue Photo</option>
            <option value="LOCATION_PROOF">Location Proof</option>
            <option value="SUPPORTING_VIDEO">Supporting Video / Record</option>
          </select>
          <input
            className="w-full rounded-lg border p-3"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            I provide consent to upload and process this issue evidence.
          </label>
          <KioskButton onClick={upload}>Upload Evidence</KioskButton>
          {message && <p className="ui-note break-all p-3 text-sm">{message}</p>}
        </div>
      </div>
    </Layout>
  );
}

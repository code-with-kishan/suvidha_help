import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import KioskButton from '../components/KioskButton';
import OnScreenKeyboard from '../components/OnScreenKeyboard';
import api from '../services/api';
import { enqueueOfflineAction } from '../services/offlineSync';

export default function ServiceSelectionPage() {
  const { t } = useTranslation();
  const [serviceType, setServiceType] = useState('electricity');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(true);

  const startVoiceFill = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('suvidha:voice-capture-request', {
        detail: {
          field: 'service_description',
          prompt: 'Please describe the local issue you want to report now.',
          source: 'service-description'
        }
      })
    );
    setMessage('Listening for issue report details...');
  }, []);

  useEffect(() => {
    const onVoiceFill = (event) => {
      const payload = event?.detail || {};
      if (payload.field !== 'service_description') return;

      const nextValue = String(payload.value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);

      if (!nextValue) return;
      setDescription(nextValue);
      setMessage('Issue report details filled from voice.');
    };

    window.addEventListener('suvidha:voice-fill', onVoiceFill);
    return () => window.removeEventListener('suvidha:voice-fill', onVoiceFill);
  }, []);

  const submitRequest = async () => {
    if (!description.trim()) {
      setMessage('Description is required.');
      return;
    }

    try {
      const { data } = await api.post('/api/services/request', { serviceType, description });
      setMessage(`Issue report submitted. Your Reference ID: ${data.referenceCode || data.id}`);
      setDescription('');
    } catch (error) {
      if (!error.response) {
        const queueLength = await enqueueOfflineAction({
          type: 'SERVICE_REQUEST_CREATE',
          payload: { serviceType, description }
        });
        setMessage(`Offline detected. Issue report queued securely. Queue size: ${queueLength}`);
        setDescription('');
        return;
      }
      setMessage(error.response?.data?.message || 'Unable to submit issue report');
    }
  };

  return (
    <Layout title="Report a Community Issue">
      <div className="hero-strip mb-4 p-5">
        <p className="ui-hand-label mb-3 inline-block">request desk</p>
        <h2 className="text-2xl font-bold">Report a Community Issue</h2>
        <p className="mt-1 text-sm text-slate-100">Log nearby problems early so the community and resolution teams can act faster.</p>
      </div>
      <div className="panel-card panel-card-hover mx-auto max-w-2xl p-6">
        <div className="space-y-3">
          <select
            className="w-full rounded-lg border p-3 text-lg"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
          >
            <option value="pothole">Pothole / Road Damage</option>
            <option value="water-leakage">Water Leakage / Drainage</option>
            <option value="street-light">Broken Streetlight</option>
            <option value="waste-management">Waste Management</option>
          </select>
          <textarea
            className="w-full rounded-lg border p-3 text-lg"
            rows={5}
            placeholder="Describe the issue, location clues, and urgency"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            type="button"
            className="touch-btn ui-chip-button"
            onClick={() => setShowKeyboard((value) => !value)}
          >
            {t('toggleKeyboard')}
          </button>
          <button
            type="button"
            className="touch-btn ui-chip-button"
            onClick={startVoiceFill}
          >
            Voice Fill Issue Details
          </button>
          {showKeyboard && <OnScreenKeyboard value={description} onChange={setDescription} maxLength={500} />}
          <KioskButton onClick={submitRequest}>Submit Issue Report</KioskButton>
          {message && <p className="ui-note p-3 text-sm">{message}</p>}
        </div>
      </div>
    </Layout>
  );
}

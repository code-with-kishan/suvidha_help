import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import KioskButton from '../components/KioskButton';
import OnScreenKeyboard from '../components/OnScreenKeyboard';
import api from '../services/api';
import { enqueueOfflineAction } from '../services/offlineSync';

export default function ComplaintPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState('sanitation');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(true);

  const startVoiceFill = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('suvidha:voice-capture-request', {
        detail: {
          field: 'complaint_description',
          prompt: 'Please describe the issue escalation now.',
          source: 'complaint-description'
        }
      })
    );
    setMessage('Listening for escalation details...');
  }, []);

  useEffect(() => {
    const onVoiceFill = (event) => {
      const payload = event?.detail || {};
      if (payload.field !== 'complaint_description') return;

      const nextValue = String(payload.value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);

      if (!nextValue) return;
      setDescription(nextValue);
      setMessage('Escalation details filled from voice.');
    };

    window.addEventListener('suvidha:voice-fill', onVoiceFill);
    return () => window.removeEventListener('suvidha:voice-fill', onVoiceFill);
  }, []);

  const submitComplaint = async () => {
    if (!description.trim()) {
      setMessage('Description is required.');
      return;
    }

    try {
      const { data } = await api.post('/api/complaints', { category, description });
      setMessage(`Issue escalation registered. Your Reference ID: ${data.referenceCode || data.id}`);
      setDescription('');
    } catch (error) {
      if (!error.response) {
        const queueLength = await enqueueOfflineAction({
          type: 'COMPLAINT_CREATE',
          payload: { category, description }
        });
        setMessage(`Offline detected. Escalation queued securely. Queue size: ${queueLength}`);
        setDescription('');
        return;
      }
      setMessage(error.response?.data?.message || 'Unable to register escalation');
    }
  };

  return (
    <Layout title="Escalate a Community Issue">
      <div className="hero-strip mb-4 p-5">
        <p className="ui-hand-label mb-3 inline-block">issue desk</p>
        <h2 className="text-2xl font-bold">Escalate a Community Issue</h2>
        <p className="mt-1 text-sm text-slate-100">Use this flow when a local issue needs stronger visibility, follow-up, or repeated escalation.</p>
      </div>
      <div className="panel-card panel-card-hover mx-auto max-w-2xl p-6">
        <div className="space-y-3">
          <select
            className="w-full rounded-lg border p-3 text-lg"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="repeated-pothole">Repeated Pothole Issue</option>
            <option value="water-leakage">Water Leakage / Overflow</option>
            <option value="street-light">Streetlight Outage</option>
            <option value="waste-overflow">Waste Overflow / Hygiene Risk</option>
          </select>
          <textarea
            rows={5}
            className="w-full rounded-lg border p-3 text-lg"
            placeholder="Describe what is unresolved, repeated, or still affecting the area"
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
            Voice Fill Escalation
          </button>
          {showKeyboard && <OnScreenKeyboard value={description} onChange={setDescription} maxLength={500} />}
          <KioskButton onClick={submitComplaint}>Submit Escalation</KioskButton>
          {message && <p className="ui-note p-3 text-sm">{message}</p>}
        </div>
      </div>
    </Layout>
  );
}

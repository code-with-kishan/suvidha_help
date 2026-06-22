import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import KioskButton from '../components/KioskButton';
import OnScreenKeypad from '../components/OnScreenKeypad';
import api, { getApiBaseUrl } from '../services/api';

export default function PaymentPage() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [serviceType, setServiceType] = useState('community-cleanup');
  const [payment, setPayment] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [message, setMessage] = useState('');
  const [risk, setRisk] = useState(null);
  const [activeField, setActiveField] = useState('');

  const normalizeSpokenAmount = useCallback((raw) => {
    const value = String(raw || '').trim();
    if (!value) return '';

    const tokenMap = {
      zero: '0',
      oh: '0',
      o: '0',
      one: '1',
      two: '2',
      to: '2',
      too: '2',
      three: '3',
      four: '4',
      for: '4',
      five: '5',
      six: '6',
      seven: '7',
      eight: '8',
      ate: '8',
      nine: '9',
      point: '.',
      dot: '.',
      decimal: '.',
      शून्य: '0',
      एक: '1',
      दो: '2',
      तीन: '3',
      चार: '4',
      पांच: '5',
      पाँच: '5',
      छह: '6',
      सात: '7',
      आठ: '8',
      नौ: '9'
    };

    const unicodeDigitNormalized = value.replace(/[०-९]/g, (char) => String(char.charCodeAt(0) - 2406));
    const direct = unicodeDigitNormalized.match(/\d+(?:\.\d+)?/);
    if (direct?.[0]) return direct[0];

    const normalized = unicodeDigitNormalized
      .toLowerCase()
      .replace(/[-,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const tokens = normalized.split(' ');
    let built = '';
    for (const token of tokens) {
      if (tokenMap[token]) built += tokenMap[token];
    }

    const safe = built.replace(/[^\d.]/g, '');
    const firstDot = safe.indexOf('.');
    if (firstDot === -1) return safe;
    const integerPart = safe.slice(0, firstDot + 1);
    const fractionPart = safe.slice(firstDot + 1).replace(/\./g, '');
    return `${integerPart}${fractionPart}`;
  }, []);

  const startVoiceFillAmount = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('suvidha:voice-capture-request', {
        detail: {
          field: 'payment_amount',
          prompt: 'Please say the support payment amount now.',
          source: 'payment-amount'
        }
      })
    );
    setMessage('Listening for support amount...');
  }, []);

  useEffect(() => {
    const onVoiceFill = (event) => {
      const payload = event?.detail || {};
      if (payload.field !== 'payment_amount') return;

      const normalized = normalizeSpokenAmount(payload.value);
      if (!normalized) {
        setMessage('Could not capture amount from voice. Please try again.');
        return;
      }

      setAmount(normalized);
      setMessage('Amount filled from voice.');
    };

    window.addEventListener('suvidha:voice-fill', onVoiceFill);
    return () => window.removeEventListener('suvidha:voice-fill', onVoiceFill);
  }, [normalizeSpokenAmount]);

  const createPayment = async () => {
    if (!amount || Number(amount) <= 0) {
      setMessage('Please enter a valid amount.');
      return;
    }

    try {
      const { data } = await api.post('/api/payments/create', { amount: Number(amount), serviceType });
      setPayment(data.payment);
      setRisk(data.risk || null);
      setReceiptUrl('');
      setMessage(`Support payment created. Txn: ${data.payment.transactionId}`);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Payment creation failed');
    }
  };

  const verify = async (status) => {
    try {
      const { data } = await api.post('/api/payments/verify', {
        paymentId: payment.id,
        status
      });
      const generatedUrl = data.receipt?.receiptUrl || '';
      setReceiptUrl(generatedUrl);
      setMessage(`Support payment ${data.payment.status}.`);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Payment verification failed');
    }
  };

  return (
    <Layout title="Community Support Payment">
      <div className="hero-strip mb-4 p-5">
        <p className="ui-hand-label mb-3 inline-block">payment lane</p>
        <h2 className="text-2xl font-bold">Community Support Payment</h2>
        <p className="mt-1 text-sm text-slate-100">Record a payment linked to neighborhood support, cleanup drives, or local issue resolution workflows.</p>
      </div>
      <div className="panel-card panel-card-hover mx-auto max-w-2xl p-6">
        <div className="space-y-3">
          <select
            className="w-full rounded-lg border p-3 text-lg"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
          >
            <option value="community-cleanup">Community Cleanup</option>
            <option value="streetlight-repair">Streetlight Repair Drive</option>
            <option value="water-response">Water Response Support</option>
            <option value="ward-improvement">Ward Improvement Fund</option>
          </select>
          <input
            className="w-full rounded-lg border p-3 text-lg"
            placeholder="Amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onFocus={() => setActiveField('amount')}
          />
          {activeField === 'amount' && (
            <OnScreenKeypad
              value={amount}
              onChange={setAmount}
              allowDecimal
              onClose={() => setActiveField('')}
            />
          )}
          <button
            type="button"
            className="touch-btn ui-chip-button"
            onClick={startVoiceFillAmount}
          >
            Voice Fill Amount
          </button>
          <KioskButton onClick={createPayment}>Create Support Payment</KioskButton>
          {payment && (
            <div className="grid gap-3 md:grid-cols-2">
              <KioskButton className="kiosk-secondary-btn" onClick={() => verify('SUCCESS')}>
                Mark Success
              </KioskButton>
              <KioskButton className="kiosk-danger-btn" onClick={() => verify('FAILED')}>
                Mark Failed
              </KioskButton>
            </div>
          )}
          {message && <p className="ui-note p-3 text-sm">{message}</p>}
          {risk && (
            <div className="ui-result-card p-3 text-sm text-slate-700">
              <p>
                <strong>Fraud Risk:</strong> {risk.riskLevel} ({risk.riskScore}/100)
              </p>
              {risk.reasons?.length > 0 && <p className="mt-1">Signals: {risk.reasons.join(', ')}</p>}
            </div>
          )}
          {receiptUrl && (
            <a
              href={`${getApiBaseUrl()}${receiptUrl}`}
              target="_blank"
              rel="noreferrer"
              className="touch-btn kiosk-primary-btn inline-flex items-center justify-center"
            >
              Download PDF Receipt
            </a>
          )}
        </div>
      </div>
    </Layout>
  );
}

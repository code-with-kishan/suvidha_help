import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import KioskButton from '../components/KioskButton';
import Layout from '../components/Layout';
import { enterGuestMode } from '../redux/store';

const govtBadges = [
  { title: 'Hyperlocal Action', sub: 'Citizens report what they see' },
  { title: 'Transparent Tracking', sub: 'Every issue gets a visible trail' },
  { title: 'Community Accountability', sub: 'Local problems, shared resolution' }
];

const schemes = [
  {
    name: 'Pothole & Road Damage',
    detail: 'Capture damaged roads early, escalate them, and keep the resolution status visible.'
  },
  {
    name: 'Water Leakage & Drainage',
    detail: 'Report leaks, drain blockages, and overflow issues with clear local evidence.'
  },
  {
    name: 'Streetlight & Waste Alerts',
    detail: 'Flag lighting failures and waste build-up to improve neighborhood safety and hygiene.'
  }
];

const highlights = [
  { label: 'Local Issues Reported', value: '12,840+' },
  { label: 'Issues Resolved', value: '9,420+' },
  { label: 'Evidence Files Submitted', value: '31,700+' },
  { label: 'Communities Engaged', value: '120+' }
];

const steps = [
  'Select your language from top menu.',
  'Click Citizen Start to join the community issue workflow.',
  'Complete secure OTP login.',
  'Choose an action: report issue, escalate issue, upload evidence, support payment, or track status.',
  'Submit the details and keep your generated reference ID for follow-up.'
];

const keyServices = [
  'Issue Reporting with Structured Categories',
  'Escalation Logging for Repeated Problems',
  'Photo and Video Evidence Upload',
  'Reference-ID Based Resolution Tracking',
  'Support Payment and Receipt History',
  'Voice-Guided Community Access'
];

export default function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  return (
    <Layout title={`${t('welcome')} • Community Hero Control Center`}>
      <section className="hero-strip p-6">
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div>
            <p className="ui-hand-label mb-3 inline-block">
              Community Hero - Hyperlocal Problem Solver
            </p>
            <h2 className="mt-2 text-3xl font-bold">{t('welcome')} to Community Hero</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-100">
              A collaborative platform for reporting, validating, tracking, and resolving neighborhood issues
              like potholes, leaks, damaged streetlights, waste build-up, and local infrastructure concerns.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {govtBadges.map((badge) => (
                <div key={badge.title} className="ui-soft-card bg-white/20 p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--surface)] text-lg">🇮🇳</div>
                    <p className="text-xs font-bold text-white">{badge.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-100">{badge.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="ui-soft-card bg-white/20 p-4">
            <h3 className="text-lg font-semibold text-white">Quick Access</h3>
            <div className="mt-3 grid gap-2">
              <KioskButton onClick={() => navigate('/language')}>Start Reporting / रिपोर्ट शुरू करें</KioskButton>
              <KioskButton className="kiosk-secondary-btn" onClick={() => navigate('/admin')}>
                Resolution Team Access
              </KioskButton>
              <button
                className="touch-btn kiosk-primary-btn kiosk-secondary-btn"
                onClick={() => {
                  dispatch(enterGuestMode());
                  navigate('/dashboard');
                }}
              >
                Explore in Guest Mode
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {highlights.map((item) => (
          <div key={item.label} className="ui-metric-card ui-tone-yellow">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="ui-metric-value mt-2 text-primary">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <article className="panel-card p-5 lg:col-span-2">
          <p className="ui-hand-label mb-3 inline-block">strict flow</p>
          <h3 className="text-lg font-semibold text-primary">How to Use This Portal (Strict Steps)</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
        <article className="panel-card ui-tone-blue p-5">
          <p className="ui-hand-label mb-3 inline-block">what you can do</p>
          <h3 className="text-lg font-semibold text-primary">Core Community Actions</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {keyServices.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-3">
        {schemes.map((scheme) => (
          <article key={scheme.name} className="panel-card p-5">
            <h3 className="text-lg font-semibold text-primary">{scheme.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{scheme.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="panel-card ui-tone-pink p-5">
          <h3 className="text-lg font-semibold text-primary">Live Community Signals</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Road repair crews are prioritizing newly verified pothole clusters in Ward 14.</li>
            <li>Leakage reports from the north block are now being grouped for faster field response.</li>
            <li>Residents can track every submitted issue online using the generated reference ID.</li>
            <li>Photo and video evidence upload remains available from 10:00 AM to 6:00 PM.</li>
          </ul>
        </article>
        <article className="panel-card ui-tone-green p-5">
          <h3 className="text-lg font-semibold text-primary">Help & Support</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              <strong>Helpline:</strong> 1800-000-0000 (Demo)
            </p>
            <p>
              <strong>Email:</strong> support@suvidha.gov.in (Demo)
            </p>
            <p>
              <strong>Service Hours:</strong> 8:00 AM to 8:00 PM
            </p>
            <p>
              <strong>Assistance:</strong> Use voice guidance and the Community Hero assistant for help at every step.
            </p>
          </div>
        </article>
      </section>
    </Layout>
  );
}

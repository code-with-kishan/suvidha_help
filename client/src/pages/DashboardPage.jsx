import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from '../components/Layout';

const tiles = [
  {
    label: 'Report New Issue',
    subtitle: 'Potholes, leaks, lighting, waste, drainage',
    path: '/services',
    icon: '⚙️',
    tone: 'ui-tone-blue'
  },
  {
    label: 'Escalate Existing Issue',
    subtitle: 'Flag repeated or unresolved neighborhood problems',
    path: '/complaints',
    icon: '📢',
    tone: 'ui-tone-pink'
  },
  {
    label: 'Upload Evidence',
    subtitle: 'Add photo, video, or document proof for faster action',
    path: '/upload-documents',
    icon: '📄',
    tone: 'ui-tone-yellow'
  },
  {
    label: 'Support Payment',
    subtitle: 'Record payment and keep a transparent receipt trail',
    path: '/payment',
    icon: '💳',
    tone: 'ui-tone-green'
  },
  {
    label: 'Track Issue Status',
    subtitle: 'Check resolution progress with your reference ID',
    path: '/status-tracking',
    icon: '📍',
    tone: 'ui-tone-red'
  },
  {
    label: 'Receipts & Records',
    subtitle: 'Review payment records and recent issue history',
    path: '/receipt',
    icon: '🧾',
    tone: 'ui-tone-blue'
  }
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { guestMode } = useSelector((state) => state.auth);

  return (
    <Layout title="Community Issue Dashboard">
      <div className="panel-card ui-grid-pattern animate-float-soft mb-5 px-5 py-5">
        <div className="relative z-10">
          <p className="ui-hand-label mb-3 inline-block">daily actions</p>
          <h2 className="text-2xl font-bold">Welcome to your Community Hero Dashboard</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Report hyperlocal issues, upload evidence, escalate repeated problems, and track community resolution in one place.
          </p>
        </div>
      </div>

      {guestMode && (
        <div className="ui-note mb-4 p-4 text-sm">
          You are in Guest Mode. To report issues, upload evidence, or record payments, please login first.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {tiles.map((tile) => (
          <button
            key={tile.path}
            onClick={() => navigate(tile.path)}
            className={`dashboard-card ui-grid-pattern touch-btn animate-pulse-glow ${tile.tone} p-4 text-left`}
          >
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div>
                <p className="ui-label mb-3">community action</p>
                <h3 className="text-xl font-bold">{tile.label}</h3>
                <p className="mt-1 text-sm">{tile.subtitle}</p>
              </div>
              <span className="text-3xl">{tile.icon}</span>
            </div>
          </button>
        ))}
      </div>
    </Layout>
  );
}

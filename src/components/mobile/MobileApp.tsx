import { useEffect, useState } from 'react';
import { useNetStore } from '../../stores/netStore';
import { NewSessionForm } from '../NewSessionForm';
import { IdentTimer } from '../IdentTimer';
import { MobileCheckIn } from './MobileCheckIn';
import { MobileTraffic } from './MobileTraffic';
import { MobileLog } from './MobileLog';

type Tab = 'checkin' | 'traffic' | 'log';

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Phone layout. Check-in and traffic are separate full-screen tabs rather than
 * panels competing for one short viewport, so each is a single-purpose screen
 * that needs no horizontal room.
 */
export function MobileApp() {
  const { session, participants, logEntries, getElapsedTime, openSession, closeSession, error } =
    useNetStore();
  const [tab, setTab] = useState<Tab>('checkin');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (session?.status !== 'active') return;
    setElapsed(getElapsedTime());
    const interval = setInterval(() => setElapsed(getElapsedTime()), 1000);
    return () => clearInterval(interval);
  }, [session?.status, getElapsedTime]);

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 px-3 py-4 text-white">
        <h1 className="mb-3 text-center text-xl font-bold">Net Control</h1>
        <NewSessionForm />
      </div>
    );
  }

  const pendingCount = participants.filter((p) => !p.acked).length;
  const trafficCount = participants.filter((p) => p.hasTraffic).length;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'checkin', label: 'Check In', badge: pendingCount || undefined },
    { id: 'traffic', label: 'Traffic', badge: trafficCount || undefined },
    { id: 'log', label: 'Log', badge: logEntries.length || undefined },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-900 text-white">
      <header className="shrink-0 border-b border-slate-700 bg-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight">{session.name}</h1>
            <p className="truncate text-[11px] text-slate-400">
              {session.frequency ? `${session.frequency} · ` : ''}NCS {session.netControlOp}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {session.status === 'active' && (
              <>
                <span className="log-data-face text-base font-medium tabular-nums">
                  {formatDuration(elapsed)}
                </span>
                <IdentTimer isActive sessionId={session.id} />
              </>
            )}
            {session.status === 'pending' && (
              <button
                onClick={openSession}
                className="min-h-9 rounded bg-green-600 px-3 text-sm font-medium text-white"
              >
                Open Net
              </button>
            )}
            {session.status === 'active' && (
              <button
                onClick={closeSession}
                className="min-h-9 rounded bg-red-600 px-2.5 text-xs font-medium text-white"
              >
                Close
              </button>
            )}
            {session.status === 'closed' && (
              <span className="text-xs font-medium text-slate-400">CLOSED</span>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-1.5 rounded border border-red-500/40 bg-red-950/40 px-2 py-1 text-xs text-red-200">
            {error}
          </div>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-2">
        {tab === 'checkin' && <MobileCheckIn />}
        {tab === 'traffic' && <MobileTraffic />}
        {tab === 'log' && <MobileLog />}
      </main>

      {/* Bottom bar: thumb-reachable, and clear of the iOS home indicator. */}
      <nav className="shrink-0 border-t border-slate-700 bg-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              aria-current={tab === entry.id ? 'page' : undefined}
              className={`flex min-h-12 flex-1 items-center justify-center gap-1.5 text-sm font-medium transition-colors ${
                tab === entry.id
                  ? 'border-t-2 border-blue-500 bg-slate-700/50 text-white'
                  : 'border-t-2 border-transparent text-slate-400'
              }`}
            >
              {entry.label}
              {entry.badge !== undefined && (
                <span
                  className={`rounded-full px-1.5 text-[11px] font-semibold ${
                    entry.id === 'traffic'
                      ? 'bg-amber-500/25 text-amber-200'
                      : entry.id === 'checkin'
                        ? 'bg-sky-500/25 text-sky-200'
                        : 'bg-slate-600/60 text-slate-200'
                  }`}
                >
                  {entry.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

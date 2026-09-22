import { useRef, useState, useEffect, type ChangeEvent } from 'react';
import { useNetStore } from '../stores/netStore';
import { IdentTimer } from './IdentTimer';

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function Header() {
  const { session, getElapsedTime, openSession, closeSession, importFromCsv, error } = useNetStore();
  const [elapsed, setElapsed] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      if (session?.status === 'active') {
        setElapsed(getElapsedTime());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.status, getElapsedTime]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const csvText = await file.text();
    importFromCsv(csvText);
    event.target.value = '';
  };

  const clock = (
    <span className="log-data-face whitespace-nowrap text-xs text-slate-300">
      {currentTime.toLocaleTimeString([], { hour12: false })}
      <span className="mx-1 text-slate-500">/</span>
      {currentTime.toISOString().slice(11, 19)}Z
    </span>
  );

  if (!session) {
    return (
      <header className="shrink-0 border-b border-slate-700 bg-slate-800 px-3 py-2 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-bold leading-tight">Net Control</h1>
            <p className="text-xs text-slate-400">Create a new session to get started</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleImportClick}
              className="rounded bg-slate-700 px-2.5 py-1 text-xs text-white transition-colors hover:bg-slate-600"
            >
              Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {clock}
          </div>
        </div>
        {error && (
          <div className="mt-2 rounded border border-red-500/40 bg-red-950/40 px-2 py-1 text-xs text-red-200">
            {error}
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="shrink-0 border-b border-slate-700 bg-slate-800 px-3 py-1.5 text-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* Identity: truncates rather than wrapping, so the bar stays one line. */}
        <h1 className="min-w-0 truncate text-base font-bold leading-tight" title={session.name}>
          {session.name}
        </h1>
        <span className="hidden truncate text-xs text-slate-300 sm:inline">
          {session.frequency && <span className="text-slate-200">{session.frequency}</span>}
          {session.frequency && <span className="mx-1.5 text-slate-600">|</span>}
          NCS {session.netControlOp}
          {session.netControlName ? ` (${session.netControlName})` : ''}
        </span>

        {/* Status, clocks and net controls sit right-aligned on one line. */}
        <div className="ml-auto flex items-center gap-2.5">
          {session.status === 'pending' && (
            <>
              <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-400">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                PENDING
              </span>
              <button
                onClick={openSession}
                className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
              >
                Open Net
              </button>
            </>
          )}
          {session.status === 'active' && (
            <>
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                ACTIVE
              </span>
              <IdentTimer isActive sessionId={session.id} />
              <button
                onClick={closeSession}
                className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
              >
                Close Net
              </button>
            </>
          )}
          {session.status === 'closed' && (
            <span className="text-xs font-medium text-slate-400">CLOSED</span>
          )}
          <span
            className="log-data-face text-xl font-medium leading-none tabular-nums"
            title={`Started ${new Date(session.dateTime).toLocaleString()}`}
          >
            {formatDuration(elapsed)}
          </span>
          {clock}
        </div>
      </div>
      {error && (
        <div className="mt-1 rounded border border-red-500/40 bg-red-950/40 px-2 py-1 text-xs text-red-200">
          {error}
        </div>
      )}
    </header>
  );
}

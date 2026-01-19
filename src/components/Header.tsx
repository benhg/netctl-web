import { useState, useEffect } from 'react';
import { useNetStore } from '../stores/netStore';

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function Header() {
  const { session, getElapsedTime, openSession, closeSession } = useNetStore();
  const [elapsed, setElapsed] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      if (session?.status === 'active') {
        setElapsed(getElapsedTime());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.status, getElapsedTime]);

  if (!session) {
    return (
      <header className="bg-slate-800 text-white p-4 border-b border-slate-700">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Net Control</h1>
            <p className="text-slate-400 text-sm">Create a new session to get started</p>
          </div>
          <div className="text-sm font-mono text-slate-300">
            <span>{currentTime.toLocaleTimeString()} Local</span>
            <span className="mx-2">|</span>
            <span>{currentTime.toISOString().slice(11, 19)}Z</span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-slate-800 text-white p-4 border-b border-slate-700">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <div className="flex gap-4 text-sm text-slate-300 mt-1">
            <span>{session.frequency}</span>
            <span>|</span>
            <span>NCS: {session.netControlOp} ({session.netControlName})</span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-3">
            {session.status === 'pending' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span className="text-yellow-400 text-sm font-medium">PENDING</span>
                </div>
                <button
                  onClick={openSession}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                >
                  Open Net
                </button>
              </>
            )}
            {session.status === 'active' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-green-400 text-sm font-medium">ACTIVE</span>
                </div>
                <button
                  onClick={closeSession}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  Close Net
                </button>
              </>
            )}
            {session.status === 'closed' && (
              <span className="text-slate-400 text-sm font-medium">CLOSED</span>
            )}
          </div>
          <div className="flex items-baseline gap-4 mt-2">
            <div className="text-3xl font-mono">{formatDuration(elapsed)}</div>
            <div className="text-sm font-mono text-slate-300">
              <span>{currentTime.toLocaleTimeString()} Local</span>
              <span className="mx-2">|</span>
              <span>{currentTime.toISOString().slice(11, 19)}Z</span>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            Started: {new Date(session.dateTime).toLocaleString()}
          </div>
        </div>
      </div>
    </header>
  );
}

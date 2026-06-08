import { useEffect, useRef, useState } from 'react';

const IDENT_INTERVAL_MS = 10 * 60 * 1000;
const DISABLED_STORAGE_KEY = 'netctl:identTimerDisabled';

const readStoredDisabled = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DISABLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

type IdentTimerProps = {
  isActive: boolean;
  sessionId: string;
};

export function IdentTimer({ isActive, sessionId }: IdentTimerProps) {
  const [disabled, setDisabled] = useState(readStoredDisabled);
  const [lastIdentAt, setLastIdentAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const previousActiveSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isActive) {
      previousActiveSessionRef.current = null;
      return;
    }

    if (previousActiveSessionRef.current !== sessionId) {
      previousActiveSessionRef.current = sessionId;
      const startedAt = Date.now();
      setLastIdentAt(startedAt);
      setNow(startedAt);
    }
  }, [isActive, sessionId]);

  useEffect(() => {
    if (!isActive || disabled) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [disabled, isActive]);

  const remainingMs = Math.max(0, IDENT_INTERVAL_MS - (now - lastIdentAt));
  const isDue = isActive && !disabled && remainingMs === 0;

  const handleDisabledChange = (checked: boolean) => {
    setDisabled(checked);
    try {
      window.localStorage.setItem(DISABLED_STORAGE_KEY, checked ? 'true' : 'false');
    } catch {
      // Ignore storage write failures.
    }

    if (!checked) {
      const restartedAt = Date.now();
      setLastIdentAt(restartedAt);
      setNow(restartedAt);
    }
  };

  const handleAcknowledge = () => {
    if (!isActive || disabled) return;

    const acknowledgedAt = Date.now();
    setLastIdentAt(acknowledgedAt);
    setNow(acknowledgedAt);
  };

  if (!isActive) return null;

  return (
    <div className="mt-3 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={handleAcknowledge}
        disabled={disabled}
        className={`min-w-32 rounded border px-3 py-2 text-left transition-colors ${
          disabled
            ? 'cursor-not-allowed border-slate-600 bg-slate-700/50 text-slate-400'
            : isDue
              ? 'ident-reminder-shake border-amber-400/70 bg-amber-500/15 text-amber-100 shadow-sm shadow-amber-500/10'
              : 'border-slate-600 bg-slate-900/50 text-slate-200 hover:border-slate-500 hover:bg-slate-700/70'
        }`}
        aria-live="polite"
      >
        <div className="text-xs font-semibold uppercase text-slate-400">
          Ident
        </div>
        <div className="font-mono text-lg leading-6">
          {disabled ? '--:--' : isDue ? 'Due now' : formatCountdown(remainingMs)}
        </div>
      </button>
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={disabled}
          onChange={(event) => handleDisabledChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-500 bg-slate-800 accent-blue-500"
        />
        Disable timer
      </label>
    </div>
  );
}

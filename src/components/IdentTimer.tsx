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
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleAcknowledge}
        disabled={disabled}
        title={
          disabled
            ? 'Ident timer disabled'
            : 'Time until the next station identification — click when you have identified'
        }
        className={`flex items-center gap-1.5 rounded border px-2 py-1 transition-colors ${
          disabled
            ? 'cursor-not-allowed border-slate-600 bg-slate-700/50 text-slate-400'
            : isDue
              ? 'ident-reminder-shake border-amber-400/70 bg-amber-500/15 text-amber-100 shadow-sm shadow-amber-500/10'
              : 'border-slate-600 bg-slate-900/50 text-slate-200 hover:border-slate-500 hover:bg-slate-700/70'
        }`}
        aria-live="polite"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">ID</span>
        <span className="log-data-face text-sm leading-none tabular-nums">
          {disabled ? '--:--' : isDue ? 'DUE' : formatCountdown(remainingMs)}
        </span>
      </button>
      <label className="flex items-center" title="Disable ident timer">
        <input
          type="checkbox"
          checked={disabled}
          onChange={(event) => handleDisabledChange(event.target.checked)}
          aria-label="Disable ident timer"
          className="h-3.5 w-3.5 rounded border-slate-500 bg-slate-800 accent-blue-500"
        />
      </label>
    </div>
  );
}

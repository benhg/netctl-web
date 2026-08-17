import { useNetStore } from '../../stores/netStore';
import { ExportButtons } from '../ExportButtons';

/**
 * Log screen. A phone has no room for the desktop table, so each entry is a card
 * with the message given the full width.
 */
export function MobileLog() {
  const { logEntries, participants, lastAcknowledgedEntryId, setLastAcknowledgedEntry } =
    useNetStore();

  const describe = (callsign: string) => {
    const participant = participants.find(
      (p) => p.callsign === callsign || p.tacticalCall === callsign
    );
    return participant?.name || '';
  };

  const entries = [...logEntries].reverse();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2">
        <h2 className="text-sm font-semibold text-white">
          Communications Log <span className="font-normal text-slate-400">{logEntries.length}</span>
        </h2>
        <ExportButtons />
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-400">
          No log entries yet
        </p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`rounded-lg border p-2 ${
                lastAcknowledgedEntryId === entry.id
                  ? 'border-emerald-500/40 bg-emerald-950/25'
                  : 'border-slate-700 bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="log-data-face shrink-0 text-[11px] text-slate-500">
                  {entry.entryNumber}
                </span>
                <span className="log-data-face shrink-0 text-xs text-slate-300 tabular-nums">
                  {new Date(entry.time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })}
                </span>
                <span
                  className="log-data-face min-w-0 truncate text-sm font-semibold text-sky-100"
                  title={describe(entry.fromCallsign)}
                >
                  {entry.fromCallsign}
                </span>
                <span className="shrink-0 text-xs text-slate-500">to</span>
                <span
                  className="log-data-face min-w-0 truncate text-sm font-semibold text-sky-100"
                  title={describe(entry.toCallsign)}
                >
                  {entry.toCallsign}
                </span>
                {lastAcknowledgedEntryId === entry.id ? (
                  <span className="ml-auto shrink-0 text-[11px] font-semibold uppercase text-emerald-300">
                    ACK
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setLastAcknowledgedEntry(entry.id)}
                    className="ml-auto min-h-8 shrink-0 rounded border border-slate-600 px-2 text-[11px] uppercase text-slate-300"
                  >
                    Mark
                  </button>
                )}
              </div>
              {entry.message && (
                <p className="mt-1 text-sm leading-snug text-slate-50">{entry.message}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

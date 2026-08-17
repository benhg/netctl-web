import { useRef } from 'react';
import { useNetStore } from '../../stores/netStore';
import { trafficQueueOf } from '../../lib/traffic';
import { CallsignInput } from '../CallsignInput';

/**
 * Traffic screen, independent of check-in: pass traffic, log it, and clear it
 * without leaving the screen or scrolling past the roster.
 */
export function MobileTraffic() {
  const {
    session,
    participants,
    logEntries,
    addLogEntry,
    updateParticipant,
    logDraft,
    patchLogDraft,
    clearLogDraft,
  } = useNetStore();
  // Shared with the desktop log form, so switching layouts keeps the draft.
  const { fromCallsign, toCallsign, message } = logDraft;
  const setFromCallsign = (value: string) => patchLogDraft({ fromCallsign: value });
  const setToCallsign = (value: string) => patchLogDraft({ toCallsign: value });
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const isActive = session?.status === 'active';
  const queue = trafficQueueOf(participants);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!fromCallsign.trim()) return;
    addLogEntry(
      {
        fromCallsign: fromCallsign.trim(),
        toCallsign: toCallsign.trim() || 'NC',
        message: message.trim(),
      },
      { clearPendingTraffic: true }
    );
    clearLogDraft();
  };

  if (!isActive) {
    return (
      <p className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-400">
        {session?.status === 'closed'
          ? 'This net is closed.'
          : 'Open the net to start handling traffic.'}
      </p>
    );
  }

  const recentTraffic = logEntries.filter((e) => e.message.trim()).slice(-8).reverse();

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-700 bg-slate-800 p-2">
        <h2 className="mb-1.5 text-sm font-semibold text-white">Log Traffic</h2>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <CallsignInput
              value={fromCallsign}
              onChange={setFromCallsign}
              placeholder="From"
              ariaLabel="From callsign"
              includeSpecial
              className="field-touch log-data-face w-full font-semibold"
            />
          </div>
          <div className="min-w-0 flex-1">
            <CallsignInput
              value={toCallsign}
              onChange={setToCallsign}
              placeholder="To"
              ariaLabel="To callsign"
              includeSpecial
              className="field-touch log-data-face w-full font-semibold"
            />
          </div>
        </div>
        <textarea
          ref={messageRef}
          value={message}
          onChange={(e) => patchLogDraft({ message: e.target.value })}
          placeholder="Traffic or remarks..."
          rows={2}
          aria-label="Traffic or remarks"
          className="field-touch mt-2 resize-none"
        />
        <button
          type="submit"
          disabled={!fromCallsign.trim()}
          className="mt-2 min-h-11 w-full rounded bg-green-600 font-medium text-white disabled:bg-slate-600"
        >
          Add Log Entry
        </button>
      </form>

      <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-amber-100">
            Traffic Queue <span className="font-normal text-amber-200/70">{queue.length}</span>
          </h2>
          {queue.length > 0 && <span className="text-[11px] text-amber-200/60">tap to log</span>}
        </div>
        {queue.length === 0 ? (
          <p className="text-xs text-amber-200/70">
            No traffic waiting. Flag a station here or on the check-in screen.
          </p>
        ) : (
          /* Caps at roughly four stations and scrolls, so a long queue does not
             push the logging form off the screen. */
          <ul className="max-h-52 space-y-1 overflow-y-auto">
            {queue.map((p, index) => (
              <li key={p.id} className="flex items-stretch gap-1 rounded bg-slate-900/50">
                {/* The row is the tap target — no separate Log button. */}
                <button
                  type="button"
                  onClick={() => {
                    setFromCallsign(p.tacticalCall || p.callsign);
                    setToCallsign('NC');
                    messageRef.current?.focus();
                  }}
                  aria-label={`Log traffic from ${p.callsign}`}
                  className="flex min-h-10 min-w-0 flex-1 items-center gap-1.5 rounded-l px-1.5 text-left"
                >
                  <span className="shrink-0 rounded bg-amber-500/25 px-1.5 text-[11px] font-semibold text-amber-100">
                    {index + 1}
                  </span>
                  {p.tacticalCall && (
                    <span className="shrink-0 text-sm font-semibold text-yellow-400">
                      {p.tacticalCall}
                    </span>
                  )}
                  <span className="log-data-face shrink-0 text-sm font-semibold text-blue-400">
                    {p.callsign}
                  </span>
                  <span className="min-w-0 truncate text-xs text-slate-300">
                    {p.trafficNote ? (
                      <span className="text-amber-200">{p.trafficNote}</span>
                    ) : (
                      p.name
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => updateParticipant(p.id, { hasTraffic: false, trafficNote: '' })}
                  aria-label={`Clear traffic for ${p.callsign}`}
                  className="min-h-10 shrink-0 rounded-r px-2.5 text-xs font-semibold text-slate-300"
                >
                  Clear
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-800 p-2">
        <h2 className="mb-1.5 text-sm font-semibold text-white">Flag Traffic</h2>
        <p className="mb-1.5 text-xs text-slate-400">
          Tap a station to mark that it has traffic waiting.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[...participants].reverse().map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                updateParticipant(p.id, {
                  hasTraffic: !p.hasTraffic,
                  trafficNote: p.hasTraffic ? '' : p.trafficNote,
                })
              }
              aria-pressed={p.hasTraffic ?? false}
              className={`log-data-face min-h-9 rounded border px-2 text-sm font-semibold ${
                p.hasTraffic
                  ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
                  : 'border-slate-600 bg-slate-900 text-slate-300'
              }`}
            >
              {p.tacticalCall || p.callsign}
            </button>
          ))}
        </div>
      </section>

      {recentTraffic.length > 0 && (
        <section className="rounded-lg border border-slate-700 bg-slate-800 p-2">
          <h2 className="mb-1.5 text-sm font-semibold text-white">Recent Entries</h2>
          <ul className="divide-y divide-slate-700/60">
            {recentTraffic.map((entry) => (
              <li key={entry.id} className="py-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="log-data-face text-slate-400 tabular-nums">
                    {new Date(entry.time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </span>
                  <span className="log-data-face font-semibold text-sky-100">
                    {entry.fromCallsign}
                  </span>
                  <span className="text-slate-500">to</span>
                  <span className="log-data-face font-semibold text-sky-100">
                    {entry.toCallsign}
                  </span>
                </div>
                <p className="text-sm text-slate-100">{entry.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

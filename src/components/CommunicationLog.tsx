import { useNetStore } from '../stores/netStore';

export function CommunicationLog() {
  const { logEntries, participants, session, lastAcknowledgedEntryId, setLastAcknowledgedEntry } =
    useNetStore();

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const findParticipant = (callsign: string) => {
    const directMatch = participants.find(
      (p) => p.callsign === callsign || p.tacticalCall === callsign
    );
    if (directMatch) return directMatch;

    if (callsign === 'NC' && session?.netControlOp) {
      return participants.find(
        (p) => p.callsign === session.netControlOp || p.tacticalCall === 'NET'
      );
    }

    return null;
  };

  const renderCallsign = (callsign: string) => {
    const participant = findParticipant(callsign);

    if (!participant) {
      return (
        <span className="log-data-face text-sm font-semibold tracking-[0.06em] text-slate-100">
          {callsign}
        </span>
      );
    }

    // One line: tactical badge and callsign inline, with the operator name in
    // the tooltip rather than a second row under every entry.
    return (
      <span
        className="flex items-center gap-1.5"
        title={participant.name || participant.callsign}
      >
        {participant.tacticalCall && (
          <span className="shrink-0 rounded bg-yellow-400/15 px-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-yellow-200">
            {participant.tacticalCall}
          </span>
        )}
        <span className="log-data-face truncate text-sm font-semibold tracking-[0.06em] text-sky-100">
          {participant.callsign}
        </span>
      </span>
    );
  };

  const classifyEntry = (entry: (typeof logEntries)[number]) => {
    const message = entry.message.toLowerCase();
    if (message.startsWith('check in')) {
      return 'checkin';
    }
    if (lastAcknowledgedEntryId === entry.id) {
      return 'ack';
    }
    if (entry.toCallsign === 'NC') {
      return 'inbound';
    }
    if (entry.fromCallsign === 'NC') {
      return 'outbound';
    }
    return 'general';
  };

  const rowClassNames: Record<string, string> = {
    checkin: 'bg-emerald-950/25 hover:bg-emerald-900/30',
    ack: 'bg-violet-950/25 hover:bg-violet-900/30',
    inbound: 'bg-sky-950/25 hover:bg-sky-900/30',
    outbound: 'bg-amber-950/25 hover:bg-amber-900/30',
    general: 'hover:bg-slate-700/40',
  };

  return (
    <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="log-heading-face text-sm font-semibold text-white">
          Communications Log
          <span className="ml-1.5 font-normal text-slate-400">{logEntries.length}</span>
        </h2>
      </div>
      {logEntries.length === 0 ? (
        <p className="text-xs text-slate-400">No log entries yet</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed text-sm">
            <thead className="sticky top-0 bg-slate-800/95 backdrop-blur">
              <tr className="log-heading-face border-b border-slate-700 text-left text-[10px] uppercase tracking-[0.1em] text-slate-400">
                <th className="w-8 pb-1 pr-2 font-semibold">#</th>
                <th className="w-16 pb-1 pr-2 font-semibold">Time</th>
                <th className="w-32 pb-1 pr-2 font-semibold">From</th>
                <th className="w-32 pb-1 pr-2 font-semibold">To</th>
                <th className="pb-1 pr-2 font-semibold">Message</th>
                <th className="w-14 pb-1 font-semibold">Ack</th>
              </tr>
            </thead>
            <tbody>
              {logEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-b border-slate-700/50 align-middle ${rowClassNames[classifyEntry(entry)]}`}
                >
                  <td className="log-data-face py-[var(--row-pad-y)] pr-2 text-xs text-slate-500">
                    {entry.entryNumber}
                  </td>
                  <td className="log-data-face py-[var(--row-pad-y)] pr-2 text-xs font-medium tabular-nums text-slate-100">
                    {formatTime(entry.time)}
                  </td>
                  <td className="py-[var(--row-pad-y)] pr-2">
                    {renderCallsign(entry.fromCallsign)}
                  </td>
                  <td className="py-[var(--row-pad-y)] pr-2">{renderCallsign(entry.toCallsign)}</td>
                  {/* Wraps rather than truncating: the message is the record. */}
                  <td className="py-[var(--row-pad-y)] pr-2 leading-snug break-words text-slate-50">
                    {entry.message || '-'}
                  </td>
                  <td className="py-[var(--row-pad-y)]">
                    {lastAcknowledgedEntryId === entry.id ? (
                      <span className="log-heading-face text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-300">
                        ACK
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setLastAcknowledgedEntry(entry.id)}
                        title="Mark as the last entry net control acknowledged"
                        className="log-heading-face min-h-5 px-1 text-[11px] uppercase tracking-[0.06em] text-slate-400 hover:text-white"
                      >
                        Mark
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

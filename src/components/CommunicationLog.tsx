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
      return <span className="log-data-face text-base font-semibold tracking-[0.08em] text-slate-100">{callsign}</span>;
    }

    return (
      <div className="flex flex-col leading-snug">
        <div className="flex items-center gap-2.5">
          {participant.tacticalCall && (
            <span className="rounded bg-yellow-400/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-yellow-200">
              {participant.tacticalCall}
            </span>
          )}
          <span className="log-data-face text-[17px] font-semibold tracking-[0.08em] text-sky-100">
            {participant.callsign}
          </span>
        </div>
        {participant.name && <span className="pt-0.5 text-[13px] text-slate-200">{participant.name}</span>}
      </div>
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
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex-1 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h2 className="log-heading-face text-lg font-semibold text-white">Communications Log</h2>
        <span className="text-sm text-slate-400">{logEntries.length} entries</span>
      </div>
      {logEntries.length === 0 ? (
        <p className="text-slate-400 text-sm">No log entries yet</p>
      ) : (
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-[15px]">
            <thead className="sticky top-0 bg-slate-800/95 backdrop-blur">
              <tr className="log-heading-face border-b border-slate-700 text-left text-[11px] uppercase tracking-[0.12em] text-slate-400">
                <th className="pb-3 pr-3 w-12">#</th>
                <th className="pb-3 pr-3 w-24">Time</th>
                <th className="pb-3 pr-3 w-40">From</th>
                <th className="pb-3 pr-3 w-40">To</th>
                <th className="pb-3">Message</th>
                <th className="pb-3 w-20">Ack</th>
              </tr>
            </thead>
            <tbody>
              {logEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-b border-slate-700/50 ${rowClassNames[classifyEntry(entry)]}`}
                >
                  <td className="log-data-face py-3 pr-3 text-sm text-slate-500">{entry.entryNumber}</td>
                  <td className="log-data-face py-3 pr-3 text-[15px] font-medium text-slate-100">{formatTime(entry.time)}</td>
                  <td className="py-3 pr-3 align-top">{renderCallsign(entry.fromCallsign)}</td>
                  <td className="py-3 pr-3 align-top">{renderCallsign(entry.toCallsign)}</td>
                  <td className="py-3 leading-relaxed text-slate-50">{entry.message || '-'}</td>
                  <td className="py-3 align-top">
                    {lastAcknowledgedEntryId === entry.id ? (
                      <span className="log-heading-face text-xs font-semibold uppercase tracking-[0.08em] text-emerald-300">NC ACK</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setLastAcknowledgedEntry(entry.id)}
                        className="log-heading-face text-xs uppercase tracking-[0.08em] text-slate-300 hover:text-white"
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

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
      return <span className="font-mono text-slate-300">{callsign}</span>;
    }

    return (
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-2">
          {participant.tacticalCall && (
            <span className="font-semibold text-yellow-400">{participant.tacticalCall}</span>
          )}
          <span className="font-mono text-blue-400 font-semibold">{participant.callsign}</span>
        </div>
        {participant.name && <span className="text-xs text-white">{participant.name}</span>}
      </div>
    );
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex-1 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-white">Communications Log</h2>
        <span className="text-sm text-slate-400">{logEntries.length} entries</span>
      </div>
      {logEntries.length === 0 ? (
        <p className="text-slate-400 text-sm">No log entries yet</p>
      ) : (
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="text-left text-slate-400 border-b border-slate-700">
                <th className="pb-2 pr-2 w-12">#</th>
                <th className="pb-2 pr-2 w-20">Time</th>
                <th className="pb-2 pr-2 w-28">From</th>
                <th className="pb-2 pr-2 w-28">To</th>
                <th className="pb-2">Message</th>
                <th className="pb-2 w-20">Ack</th>
              </tr>
            </thead>
            <tbody>
              {logEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-2 pr-2 text-slate-500">{entry.entryNumber}</td>
                  <td className="py-2 pr-2 font-mono text-slate-300">{formatTime(entry.time)}</td>
                  <td className="py-2 pr-2">{renderCallsign(entry.fromCallsign)}</td>
                  <td className="py-2 pr-2">{renderCallsign(entry.toCallsign)}</td>
                  <td className="py-2 text-white">{entry.message || '-'}</td>
                  <td className="py-2">
                    {lastAcknowledgedEntryId === entry.id ? (
                      <span className="text-xs font-semibold text-emerald-300">NC ACK</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setLastAcknowledgedEntry(entry.id)}
                        className="text-xs text-slate-300 hover:text-white"
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

import { useNetStore } from '../stores/netStore';

export function ICS309Preview() {
  const { session, participants, logEntries } = useNetStore();

  if (!session) return null;

  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getOperationalPeriodEnd = (): string => {
    if (session.status === 'closed') {
      const lastEntry = logEntries[logEntries.length - 1];
      return session.endTime || lastEntry?.time || session.dateTime;
    }
    if (session.status === 'active') {
      return new Date().toISOString();
    }
    return session.dateTime;
  };

  const operationalPeriodEnd = getOperationalPeriodEnd();

  return (
    <div className="bg-white text-black p-6 rounded-lg shadow-lg max-h-[600px] overflow-y-auto">
      <div className="border-2 border-black">
        {/* Header */}
        <div className="border-b-2 border-black p-2 bg-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold">COMMUNICATIONS LOG</div>
              <div className="text-lg font-bold">ICS 309</div>
            </div>
            <div className="text-right text-xs">
              <div>Date Prepared: {formatDate(new Date().toISOString())}</div>
              <div>Time Prepared: {formatTime(new Date().toISOString())}</div>
            </div>
          </div>
        </div>

        {/* Incident Info */}
        <div className="grid grid-cols-2 border-b border-black text-sm">
          <div className="border-r border-black p-2">
            <div className="text-xs text-gray-600">1. Incident Name</div>
            <div className="font-semibold">{session.name}</div>
          </div>
          <div className="p-2">
            <div className="text-xs text-gray-600">2. Operational Period</div>
            <div>
              {formatDate(session.dateTime)} {formatTime(session.dateTime)} - {formatDate(operationalPeriodEnd)} {formatTime(operationalPeriodEnd)}
            </div>
          </div>
        </div>

        {/* Radio Operator */}
        <div className="border-b border-black p-2 text-sm">
          <div className="text-xs text-gray-600">3. Radio Operator (Name, Call Sign)</div>
          <div className="font-semibold">{session.netControlName} - {session.netControlOp}</div>
          <div className="text-xs text-gray-500">Frequency: {session.frequency}</div>
        </div>

        {/* Participants */}
        <div className="border-b border-black p-2 text-sm">
          <div className="text-xs text-gray-600 mb-1">Checked-In Stations ({participants.length})</div>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <span key={p.id} className="text-xs bg-gray-200 px-2 py-1 rounded">
                {p.tacticalCall ? `${p.tacticalCall} / ` : ''}{p.callsign} ({p.name})
              </span>
            ))}
          </div>
        </div>

        {/* Log Table */}
        <div className="p-2">
          <div className="text-xs text-gray-600 mb-2">4. Log (Communications)</div>
          <table className="w-full text-xs border border-gray-400">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 px-2 py-1 text-left w-12">#</th>
                <th className="border border-gray-400 px-2 py-1 text-left w-16">Time</th>
                <th className="border border-gray-400 px-2 py-1 text-left w-20">From</th>
                <th className="border border-gray-400 px-2 py-1 text-left w-20">To</th>
                <th className="border border-gray-400 px-2 py-1 text-left">Subject/Remarks</th>
              </tr>
            </thead>
            <tbody>
              {logEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-400 px-2 py-4 text-center text-gray-500">
                    No log entries
                  </td>
                </tr>
              ) : (
                logEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="border border-gray-400 px-2 py-1">{entry.entryNumber}</td>
                    <td className="border border-gray-400 px-2 py-1 font-mono">{formatTime(entry.time)}</td>
                    <td className="border border-gray-400 px-2 py-1 font-mono">{entry.fromCallsign}</td>
                    <td className="border border-gray-400 px-2 py-1 font-mono">{entry.toCallsign}</td>
                    <td className="border border-gray-400 px-2 py-1">{entry.message || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-black p-2 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-600">5. Prepared by (Name, Position)</div>
              <div className="border-b border-gray-400 h-6 mt-1"></div>
            </div>
            <div>
              <div className="text-gray-600">Page ___ of ___</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

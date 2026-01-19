import { useNetStore } from '../stores/netStore';
import type { Participant } from '../types';

interface ParticipantListProps {
  onSelectParticipant: (participant: Participant) => void;
}

export function ParticipantList({ onSelectParticipant }: ParticipantListProps) {
  const { participants, logEntries, removeParticipant, session } = useNetStore();

  const getLastTransmission = (callsign: string): string | null => {
    const entries = logEntries.filter(
      (e) => e.fromCallsign === callsign || e.toCallsign === callsign
    );
    if (entries.length === 0) return null;
    const last = entries[entries.length - 1];
    return new Date(last.time).toLocaleTimeString();
  };

  if (participants.length === 0) {
    return (
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-3">Checked In Stations</h2>
        <p className="text-slate-400 text-sm">No stations checked in yet</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-white">Checked In Stations</h2>
        <span className="text-sm text-slate-400">{participants.length} stations</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {participants.map((p) => {
          const lastTx = getLastTransmission(p.callsign);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-2 bg-slate-900 rounded hover:bg-slate-700 transition-colors group"
            >
              <button
                onClick={() => onSelectParticipant(p)}
                className="flex-1 text-left"
                disabled={session?.status !== 'active'}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-6">#{p.checkInNumber}</span>
                  {p.tacticalCall && (
                    <span className="font-semibold text-yellow-400">{p.tacticalCall}</span>
                  )}
                  <span className="font-mono text-blue-400 font-semibold">{p.callsign}</span>
                  <span className="text-white">{p.name}</span>
                  <span className="text-slate-400 text-sm">{p.location}</span>
                </div>
                {lastTx && (
                  <div className="text-xs text-slate-500 ml-9">Last TX: {lastTx}</div>
                )}
              </button>
              {session?.status === 'active' && (
                <button
                  onClick={() => removeParticipant(p.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-sm px-2 transition-opacity"
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

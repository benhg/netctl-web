import { useState } from 'react';
import { useNetStore } from '../stores/netStore';
import type { Participant } from '../types';

interface ParticipantListProps {
  onSelectParticipant: (participant: Participant) => void;
}

export function ParticipantList({ onSelectParticipant }: ParticipantListProps) {
  const { participants, logEntries, removeParticipant, updateParticipant, session } = useNetStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCallsign, setEditCallsign] = useState('');
  const [editTacticalCall, setEditTacticalCall] = useState('');
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');

  const startEditing = (participant: Participant) => {
    setEditingId(participant.id);
    setEditCallsign(participant.callsign);
    setEditTacticalCall(participant.tacticalCall);
    setEditName(participant.name);
    setEditLocation(participant.location);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditCallsign('');
    setEditTacticalCall('');
    setEditName('');
    setEditLocation('');
  };

  const saveEditing = (id: string) => {
    if (!editCallsign.trim()) return;
    updateParticipant(id, {
      callsign: editCallsign.toUpperCase().trim(),
      tacticalCall: editTacticalCall.trim(),
      name: editName.trim(),
      location: editLocation.trim(),
    });
    cancelEditing();
  };

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
              {editingId === p.id ? (
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Callsign *</label>
                      <input
                        type="text"
                        value={editCallsign}
                        onChange={(e) => setEditCallsign(e.target.value.toUpperCase())}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Tactical</label>
                      <input
                        type="text"
                        value={editTacticalCall}
                        onChange={(e) => setEditTacticalCall(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Location</label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => saveEditing(p.id)}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      <button
                        onClick={() => startEditing(p)}
                        className="text-slate-300 hover:text-white text-sm px-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeParticipant(p.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-2"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

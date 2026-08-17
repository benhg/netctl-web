import { useState } from 'react';
import { useNetStore } from '../stores/netStore';
import type { Participant } from '../types';

interface ParticipantListProps {
  onSelectParticipant: (participant: Participant) => void;
}

const selectAllOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
  event.target.select();
};

export function ParticipantList({ onSelectParticipant }: ParticipantListProps) {
  const {
    participants,
    logEntries,
    removeParticipant,
    updateParticipant,
    ackParticipant,
    ackAllPending,
    setRequireAck,
    session,
  } = useNetStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCallsign, setEditCallsign] = useState('');
  const [editTacticalCall, setEditTacticalCall] = useState('');
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editHasTraffic, setEditHasTraffic] = useState(false);
  const [editTrafficNote, setEditTrafficNote] = useState('');
  // Pending callsigns are edited in place; hold the keystrokes locally so the
  // store (and its log-entry rewrite) is only touched once, on commit.
  const [callsignDrafts, setCallsignDrafts] = useState<Record<string, string>>({});

  const startEditing = (participant: Participant) => {
    setEditingId(participant.id);
    setEditCallsign(participant.callsign);
    setEditTacticalCall(participant.tacticalCall);
    setEditName(participant.name);
    setEditLocation(participant.location);
    setEditHasTraffic(participant.hasTraffic ?? false);
    setEditTrafficNote(participant.trafficNote ?? '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditCallsign('');
    setEditTacticalCall('');
    setEditName('');
    setEditLocation('');
    setEditHasTraffic(false);
    setEditTrafficNote('');
  };

  const saveEditing = (id: string) => {
    if (!editCallsign.trim()) return;
    updateParticipant(id, {
      callsign: editCallsign.toUpperCase().trim(),
      tacticalCall: editTacticalCall.trim(),
      name: editName.trim(),
      location: editLocation.trim(),
      hasTraffic: editHasTraffic,
      trafficNote: editTrafficNote.trim(),
    });
    cancelEditing();
  };

  const clearDraft = (id: string) => {
    setCallsignDrafts((drafts) => {
      if (!(id in drafts)) return drafts;
      const next = { ...drafts };
      delete next[id];
      return next;
    });
  };

  const commitCallsign = (participant: Participant) => {
    const draft = callsignDrafts[participant.id];
    clearDraft(participant.id);
    if (draft === undefined) return;
    const next = draft.toUpperCase().trim();
    if (!next || next === participant.callsign) return;
    updateParticipant(participant.id, { callsign: next });
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
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex-1">
        <h2 className="text-lg font-semibold text-white mb-3">Checked In Stations</h2>
        <p className="text-slate-400 text-sm">No stations checked in yet</p>
      </div>
    );
  }

  const isActive = session?.status === 'active';
  const trafficQueue = participants
    .filter((participant) => participant.hasTraffic)
    .sort((a, b) => a.checkInNumber - b.checkInNumber);
  const nextTraffic = trafficQueue[0] ?? null;
  const pendingCount = participants.filter((p) => !p.acked).length;
  // Newest check-in first, so stations still calling in are at the top.
  const orderedParticipants = [...participants].reverse();

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex-1 min-h-0 flex flex-col">
      <div className="flex justify-between items-center gap-3 mb-3">
        <h2 className="text-lg font-semibold text-white">Checked In Stations</h2>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={ackAllPending}
              disabled={!isActive}
              className="rounded bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              ACK all ({pendingCount})
            </button>
          )}
          <label className="flex items-center gap-1.5 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={session?.requireAck ?? false}
              onChange={(e) => setRequireAck(e.target.checked)}
              className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
            Require ACK
          </label>
          <span className="text-sm text-slate-400">{participants.length} stations</span>
        </div>
      </div>
      <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-amber-300">Traffic Queue</div>
            <div className="text-sm text-white">
              {nextTraffic
                ? `Next traffic: ${nextTraffic.tacticalCall || nextTraffic.callsign}`
                : 'No pending traffic'}
            </div>
          </div>
          <div className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200">
            {trafficQueue.length} waiting
          </div>
        </div>
        {trafficQueue.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {trafficQueue.map((participant, index) => (
              <span
                key={participant.id}
                className="rounded-full bg-slate-900/70 px-2 py-1 text-xs text-amber-100"
              >
                #{index + 1} {participant.tacticalCall || participant.callsign}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
        {orderedParticipants.map((p) => {
          const lastTx = getLastTransmission(p.callsign);
          const trafficIndex = trafficQueue.findIndex((participant) => participant.id === p.id);

          // Waiting for acknowledgement: one compact line, callsign editable in
          // place because a mis-heard call is corrected before it is ACKed.
          if (!p.acked) {
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded border border-sky-500/40 bg-sky-950/40 p-2"
              >
                <span className="w-6 shrink-0 text-xs text-slate-500">#{p.checkInNumber}</span>
                <input
                  type="text"
                  value={callsignDrafts[p.id] ?? p.callsign}
                  onChange={(e) =>
                    setCallsignDrafts((drafts) => ({
                      ...drafts,
                      [p.id]: e.target.value.toUpperCase(),
                    }))
                  }
                  onFocus={selectAllOnFocus}
                  onBlur={() => commitCallsign(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      clearDraft(p.id);
                      e.currentTarget.blur();
                    }
                  }}
                  disabled={!isActive}
                  aria-label={`Callsign for pending station #${p.checkInNumber}`}
                  className="w-32 rounded border border-slate-600 bg-slate-900 px-2 py-1 font-mono text-sm font-semibold uppercase text-sky-200 focus:border-sky-400 focus:outline-none disabled:opacity-60"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={p.hasTraffic ?? false}
                    onChange={(e) =>
                      updateParticipant(p.id, {
                        hasTraffic: e.target.checked,
                        trafficNote: e.target.checked ? p.trafficNote : '',
                      })
                    }
                    disabled={!isActive}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  Traffic
                </label>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => ackParticipant(p.id)}
                    disabled={!isActive}
                    className="rounded bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    ACK
                  </button>
                  <button
                    type="button"
                    onClick={() => removeParticipant(p.id)}
                    disabled={!isActive}
                    className="px-1 text-sm text-red-400 transition-colors hover:text-red-300 disabled:text-slate-600"
                    aria-label={`Remove ${p.callsign}`}
                  >
                    &times;
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2 rounded transition-colors group ${
                p.hasTraffic
                  ? 'bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/40'
                  : 'bg-slate-900 hover:bg-slate-700'
              }`}
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
                        onFocus={selectAllOnFocus}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Tactical</label>
                      <input
                        type="text"
                        value={editTacticalCall}
                        onChange={(e) => setEditTacticalCall(e.target.value)}
                        onFocus={selectAllOnFocus}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onFocus={selectAllOnFocus}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Location</label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        onFocus={selectAllOnFocus}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 text-[10px] text-slate-300 mb-1">
                        <input
                          type="checkbox"
                          checked={editHasTraffic}
                          onChange={(e) => setEditHasTraffic(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-amber-500 focus:ring-amber-500"
                        />
                        Pending traffic
                      </label>
                      <input
                        type="text"
                        value={editTrafficNote}
                        onChange={(e) => setEditTrafficNote(e.target.value)}
                        onFocus={selectAllOnFocus}
                        placeholder="Optional traffic note"
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
                    disabled={!isActive}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-6">#{p.checkInNumber}</span>
                      <label
                        className="flex items-center gap-2 text-xs text-slate-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={p.hasTraffic ?? false}
                          onChange={(e) =>
                            updateParticipant(p.id, {
                              hasTraffic: e.target.checked,
                              trafficNote: e.target.checked ? p.trafficNote : '',
                            })
                          }
                          disabled={!isActive}
                          className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-amber-500 focus:ring-amber-500"
                        />
                      </label>
                      {typeof trafficIndex === 'number' && trafficIndex >= 0 && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                          Traffic #{trafficIndex + 1}
                        </span>
                      )}
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
                    {p.hasTraffic && p.trafficNote && (
                      <div className="text-xs text-amber-200 ml-9">Traffic: {p.trafficNote}</div>
                    )}
                  </button>
                  {isActive && (
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

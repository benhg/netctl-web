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

  const getLastTransmission = (callsign: string) => {
    const entries = logEntries.filter(
      (e) => e.fromCallsign === callsign || e.toCallsign === callsign
    );
    if (entries.length === 0) return null;
    const time = new Date(entries[entries.length - 1].time);
    return {
      // HH:MM is enough to read at a glance; seconds live in the tooltip.
      short: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      full: time.toLocaleTimeString(),
    };
  };

  if (participants.length === 0) {
    return (
      <div className="panel flex-1">
        <h2 className="text-sm font-semibold text-white">Checked In Stations</h2>
        <p className="mt-1 text-xs text-slate-400">No stations checked in yet</p>
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
    <div className="panel @container flex min-h-0 flex-1 flex-col">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">
          Checked In Stations
          <span className="ml-1.5 font-normal text-slate-400">{participants.length}</span>
        </h2>
        <div className="flex items-center gap-2.5">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={ackAllPending}
              disabled={!isActive}
              className="min-h-6 rounded bg-sky-600 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              ACK all ({pendingCount})
            </button>
          )}
          <label
            className="flex items-center gap-1.5 text-xs text-slate-300"
            title="New check-ins wait for a net control acknowledgement"
          >
            <input
              type="checkbox"
              checked={session?.requireAck ?? false}
              onChange={(e) => setRequireAck(e.target.checked)}
              className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
            Require ACK
          </label>
        </div>
      </div>
      {/*
       * Always present, empty or not. It holds one line either way, so the rows
       * below never shift under the pointer when traffic arrives or clears, and
       * "no traffic waiting" is itself worth stating during a net.
       */}
      <div
        className={`mb-1.5 flex items-center gap-2 rounded border px-2 py-1 ${
          trafficQueue.length > 0
            ? 'border-amber-500/30 bg-amber-500/10'
            : 'border-slate-700 bg-slate-900/40'
        }`}
      >
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
            trafficQueue.length > 0 ? 'text-amber-300' : 'text-slate-500'
          }`}
        >
          Traffic
        </span>
        {trafficQueue.length > 0 ? (
          <>
            <span className="shrink-0 text-xs font-semibold text-white">
              {nextTraffic?.tacticalCall || nextTraffic?.callsign}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-amber-100/80">
              {trafficQueue
                .slice(1)
                .map((p) => p.tacticalCall || p.callsign)
                .join(' · ')}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 text-xs text-slate-500">No traffic waiting</span>
        )}
        <span
          className={`shrink-0 rounded-full px-1.5 text-[11px] font-semibold ${
            trafficQueue.length > 0
              ? 'bg-amber-500/20 text-amber-200'
              : 'bg-slate-700/50 text-slate-400'
          }`}
        >
          {trafficQueue.length}
        </span>
      </div>
      <div className="flex-1 min-h-0 space-y-1 overflow-y-auto">
        {orderedParticipants.map((p) => {
          const lastTx = getLastTransmission(p.callsign);
          const trafficIndex = trafficQueue.findIndex((participant) => participant.id === p.id);

          // Waiting for acknowledgement: one compact line, callsign editable in
          // place because a mis-heard call is corrected before it is ACKed.
          if (!p.acked) {
            return (
              <div
                key={p.id}
                className="data-row flex items-center gap-1.5 rounded border border-sky-500/40 bg-sky-950/40 px-1.5"
              >
                <span className="w-5 shrink-0 text-[11px] text-slate-500">{p.checkInNumber}</span>
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
                  className="log-data-face w-[7.5rem] rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-sm font-semibold uppercase text-sky-200 focus:border-sky-400 focus:outline-none disabled:opacity-60"
                />
                <label className="flex items-center gap-1 text-xs text-slate-300">
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
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => ackParticipant(p.id)}
                    disabled={!isActive}
                    /* Clicked constantly during a check-in run, so it keeps a
                       comfortable target even at the tightest density. */
                    className="min-h-6 rounded bg-sky-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    ACK
                  </button>
                  <button
                    type="button"
                    onClick={() => removeParticipant(p.id)}
                    disabled={!isActive}
                    className="min-h-6 px-1.5 text-sm text-red-400 transition-colors hover:text-red-300 disabled:text-slate-600"
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
              className={`group data-row flex items-center gap-1.5 rounded px-1.5 transition-colors ${
                p.hasTraffic
                  ? 'border border-amber-500/30 bg-amber-950/40 hover:bg-amber-900/40'
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
                  <label
                    className="flex shrink-0 items-center"
                    onClick={(e) => e.stopPropagation()}
                    title="Has traffic"
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
                      aria-label={`${p.callsign} has traffic`}
                      className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-amber-500 focus:ring-amber-500"
                    />
                  </label>
                  {/*
                   * One line per station: identity keeps its full size, and the
                   * softer details truncate first as the column narrows.
                   */}
                  <button
                    onClick={() => onSelectParticipant(p)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    disabled={!isActive}
                  >
                    <span className="w-5 shrink-0 text-[11px] text-slate-500">
                      {p.checkInNumber}
                    </span>
                    {trafficIndex >= 0 && (
                      <span
                        className="shrink-0 rounded bg-amber-500/20 px-1 text-[10px] font-semibold text-amber-200"
                        title={`Traffic queue position ${trafficIndex + 1}`}
                      >
                        T{trafficIndex + 1}
                      </span>
                    )}
                    {p.tacticalCall && (
                      <span className="shrink-0 text-sm font-semibold text-yellow-400">
                        {p.tacticalCall}
                      </span>
                    )}
                    <span className="log-data-face shrink-0 text-sm font-semibold text-blue-400">
                      {p.callsign}
                    </span>
                    {p.name && (
                      <span className="min-w-0 truncate text-sm text-white" title={p.name}>
                        {p.name}
                      </span>
                    )}
                    {/*
                     * Location and last-TX are dropped by the column's own width,
                     * not the window's, so a narrow left panel spends its pixels
                     * on the callsign and name instead of clipping all four.
                     */}
                    {p.location && (
                      <span
                        className="hidden min-w-0 truncate text-xs text-slate-400 @min-[26rem]:inline"
                        title={p.location}
                      >
                        {p.location}
                      </span>
                    )}
                    {p.hasTraffic && p.trafficNote && (
                      <span
                        className="hidden min-w-0 truncate text-xs text-amber-200 @min-[32rem]:inline"
                        title={p.trafficNote}
                      >
                        {p.trafficNote}
                      </span>
                    )}
                    {lastTx && (
                      <span
                        className="log-data-face ml-auto hidden shrink-0 pl-1 text-[11px] tabular-nums text-slate-500 @min-[22rem]:inline"
                        title={`Last transmission ${lastTx.full}`}
                      >
                        {lastTx.short}
                      </span>
                    )}
                  </button>
                  {isActive && (
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      <button
                        onClick={() => startEditing(p)}
                        className="px-1 text-xs text-slate-300 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeParticipant(p.id)}
                        className="px-1 text-sm text-red-400 hover:text-red-300"
                        aria-label={`Remove ${p.callsign}`}
                      >
                        &times;
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

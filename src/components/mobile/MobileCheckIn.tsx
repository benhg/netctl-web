import { useRef, useState } from 'react';
import { useNetStore } from '../../stores/netStore';
import { usePendingCallsign } from '../../hooks/usePendingCallsign';

const selectAllOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
  event.target.select();
};

/**
 * Check-in screen. The callsign field is the whole point, so it gets the width
 * and the focus; everything else is optional and folded away until asked for.
 */
export function MobileCheckIn() {
  const {
    session,
    participants,
    addParticipant,
    updateParticipant,
    removeParticipant,
    ackParticipant,
    ackAllPending,
    setRequireAck,
    lookupCallsign,
    checkInDraft,
    patchCheckInDraft,
    clearCheckInDraft,
  } = useNetStore();
  const { callsign, tacticalCall, name, location, hasTraffic } = checkInDraft;
  const [showDetails, setShowDetails] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const callsignRef = useRef<HTMLInputElement>(null);
  // Same draft-then-commit editing as the desktop roster.
  const pendingCallsign = usePendingCallsign();

  const isActive = session?.status === 'active';
  const pending = participants.filter((p) => !p.acked);
  const acked = [...participants].filter((p) => p.acked).reverse();

  const formatLocation = (city: string, state: string) =>
    [city, state].filter(Boolean).join(', ').trim();

  /**
   * Look up on blur, same as the desktop form. Without this the lookup only ran
   * after check-in and filled fields that are collapsed, so it appeared not to
   * work at all on a phone.
   */
  const handleCallsignBlur = async () => {
    const target = callsign.trim();
    if (target.length < 3 || name || location) return;
    setIsLookingUp(true);
    const result = await lookupCallsign(target);
    // Tapping Check In blurs the field first, so this lookup can land after the
    // station is already logged and the draft cleared. The draft is shared, so
    // writing into it then would seed the NEXT station with this one's name and
    // QTH — and the mobile form skips its own lookup when those are filled.
    const draft = useNetStore.getState().checkInDraft;
    const stillEditing =
      draft.callsign.trim().toUpperCase() === target.toUpperCase() && !draft.name && !draft.location;
    if (result && stillEditing) {
      patchCheckInDraft({ name: result.name, location: formatLocation(result.city, result.state) });
    }
    setIsLookingUp(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = callsign.toUpperCase().trim();
    if (!normalized) return;

    const id = addParticipant({
      callsign: normalized,
      tacticalCall: tacticalCall.trim(),
      name: name.trim(),
      location: location.trim(),
      hasTraffic,
      initialTraffic: checkInDraft.note.trim(),
    });

    // Fill name and QTH from the lookup when it lands, without making the
    // operator wait for the network before the station is in the log.
    if (!name.trim() && !location.trim()) {
      lookupCallsign(normalized).then((result) => {
        if (!result) return;
        // Re-read the station: the operator may have filled these in by hand
        // while the lookup was in flight, and the registry must not overwrite
        // what they typed.
        const participant = useNetStore.getState().participants.find((p) => p.id === id);
        if (!participant) return;
        const updates: { name?: string; location?: string } = {};
        if (!participant.name && result.name) updates.name = result.name;
        if (!participant.location) {
          const nextLocation = formatLocation(result.city, result.state);
          if (nextLocation) updates.location = nextLocation;
        }
        if (Object.keys(updates).length > 0) updateParticipant(id, updates);
      });
    }

    clearCheckInDraft();
    setShowDetails(false);
    callsignRef.current?.focus();
  };

  if (!isActive) {
    return (
      <p className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-400">
        {session?.status === 'closed'
          ? 'This net is closed.'
          : 'Open the net to start checking in stations.'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-700 bg-slate-800 p-2">
        <div className="flex gap-2">
          <input
            ref={callsignRef}
            type="text"
            value={callsign}
            onChange={(e) => patchCheckInDraft({ callsign: e.target.value.toUpperCase() })}
            onFocus={selectAllOnFocus}
            onBlur={handleCallsignBlur}
            placeholder="CALLSIGN"
            aria-label="Callsign"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="field-touch log-data-face min-w-0 flex-1 font-semibold uppercase"
          />
          <button
            type="submit"
            disabled={!callsign.trim()}
            className="min-h-11 shrink-0 rounded bg-blue-600 px-4 font-medium text-white disabled:bg-slate-600"
          >
            Check In
          </button>
        </div>
        {/* Confirms the lookup landed while the detail fields stay collapsed. */}
        {!showDetails && (isLookingUp || name || location) && (
          <p className="mt-1.5 truncate text-xs text-slate-400">
            {isLookingUp ? (
              'Looking up…'
            ) : (
              <>
                <span className="text-slate-200">{name}</span>
                {name && location ? ' · ' : ''}
                {location}
              </>
            )}
          </p>
        )}
        {showDetails && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={tacticalCall}
              onChange={(e) => patchCheckInDraft({ tacticalCall: e.target.value })}
              onFocus={selectAllOnFocus}
              placeholder="Tactical call"
              aria-label="Tactical call"
              className="field-touch"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => patchCheckInDraft({ name: e.target.value })}
              onFocus={selectAllOnFocus}
              placeholder="Name"
              aria-label="Name"
              className="field-touch"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => patchCheckInDraft({ location: e.target.value })}
              onFocus={selectAllOnFocus}
              placeholder="Location/QTH"
              aria-label="Location or QTH"
              className="field-touch"
            />
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDetails((current) => !current)}
            className="min-h-8 text-xs text-slate-400"
          >
            {showDetails ? '− Fewer fields' : '+ Tactical, name, QTH'}
          </button>
          <div className="flex items-center gap-3">
            <label className="flex min-h-8 items-center gap-1.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={hasTraffic}
                onChange={(e) => patchCheckInDraft({ hasTraffic: e.target.checked })}
                className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-amber-500"
              />
              Traffic
            </label>
            <label className="flex min-h-8 items-center gap-1.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={session?.requireAck ?? false}
                onChange={(e) => setRequireAck(e.target.checked)}
                className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-sky-500"
              />
              Require ACK
            </label>
          </div>
        </div>
      </form>

      {pending.length > 0 && (
        <section className="rounded-lg border border-sky-500/40 bg-sky-950/30 p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-sky-100">Pending ACK {pending.length}</h2>
            <button
              type="button"
              onClick={ackAllPending}
              className="min-h-9 rounded bg-sky-600 px-3 text-sm font-semibold text-white"
            >
              ACK all
            </button>
          </div>
          <ul className="space-y-1.5">
            {[...pending].reverse().map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={pendingCallsign.valueFor(p)}
                    onChange={(e) => pendingCallsign.setValue(p.id, e.target.value)}
                    onFocus={selectAllOnFocus}
                    onBlur={() => pendingCallsign.commit(p)}
                    onKeyDown={pendingCallsign.handleKeyDown}
                    aria-label={`Callsign for pending station ${p.checkInNumber}`}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    className="field-touch log-data-face font-semibold uppercase text-sky-200"
                  />
                  {/* Shows the lookup result on a station that is still pending. */}
                  {(p.name || p.location) && (
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {[p.name, p.location].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateParticipant(p.id, {
                      hasTraffic: !p.hasTraffic,
                      trafficNote: p.hasTraffic ? '' : p.trafficNote,
                    })
                  }
                  aria-pressed={p.hasTraffic ?? false}
                  className={`min-h-11 shrink-0 rounded border px-2.5 text-xs font-semibold ${
                    p.hasTraffic
                      ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
                      : 'border-slate-600 text-slate-400'
                  }`}
                >
                  Traffic
                </button>
                <button
                  type="button"
                  onClick={() => ackParticipant(p.id)}
                  className="min-h-11 shrink-0 rounded bg-sky-600 px-3 text-sm font-semibold text-white"
                >
                  ACK
                </button>
                <button
                  type="button"
                  onClick={() => removeParticipant(p.id)}
                  aria-label={`Remove ${p.callsign}`}
                  className="min-h-11 shrink-0 px-2 text-lg text-red-400"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-slate-700 bg-slate-800 p-2">
        <h2 className="mb-1.5 text-sm font-semibold text-white">
          Checked In <span className="font-normal text-slate-400">{acked.length}</span>
        </h2>
        {acked.length === 0 ? (
          <p className="text-xs text-slate-400">No stations checked in yet</p>
        ) : (
          <ul className="divide-y divide-slate-700/60">
            {acked.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-1.5">
                <span className="w-5 shrink-0 text-[11px] text-slate-500">{p.checkInNumber}</span>
                {p.tacticalCall && (
                  <span className="shrink-0 text-sm font-semibold text-yellow-400">
                    {p.tacticalCall}
                  </span>
                )}
                <span className="log-data-face shrink-0 text-sm font-semibold text-blue-400">
                  {p.callsign}
                </span>
                {p.name && <span className="min-w-0 truncate text-sm text-white">{p.name}</span>}
                {p.hasTraffic && (
                  <span className="ml-auto shrink-0 rounded bg-amber-500/20 px-1.5 text-[11px] font-semibold text-amber-200">
                    TFC
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

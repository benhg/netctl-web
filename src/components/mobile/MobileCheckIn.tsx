import { useRef, useState } from 'react';
import { useNetStore } from '../../stores/netStore';

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
  } = useNetStore();
  const [callsign, setCallsign] = useState('');
  const [tacticalCall, setTacticalCall] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const callsignRef = useRef<HTMLInputElement>(null);

  const isActive = session?.status === 'active';
  const pending = participants.filter((p) => !p.acked);
  const acked = [...participants].filter((p) => p.acked).reverse();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = callsign.toUpperCase().trim();
    if (!normalized) return;

    const id = addParticipant({
      callsign: normalized,
      tacticalCall: tacticalCall.trim(),
      name: name.trim(),
      location: location.trim(),
    });

    // Fill name and QTH from the lookup when it lands, without making the
    // operator wait for the network before the station is in the log.
    if (!name.trim() && !location.trim()) {
      lookupCallsign(normalized).then((result) => {
        if (!result) return;
        const updates: { name?: string; location?: string } = {};
        if (result.name) updates.name = result.name;
        const nextLocation = [result.city, result.state].filter(Boolean).join(', ');
        if (nextLocation) updates.location = nextLocation;
        if (Object.keys(updates).length > 0) updateParticipant(id, updates);
      });
    }

    setCallsign('');
    setTacticalCall('');
    setName('');
    setLocation('');
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
            onChange={(e) => setCallsign(e.target.value.toUpperCase())}
            onFocus={selectAllOnFocus}
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
        {showDetails && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={tacticalCall}
              onChange={(e) => setTacticalCall(e.target.value)}
              onFocus={selectAllOnFocus}
              placeholder="Tactical call"
              aria-label="Tactical call"
              className="field-touch"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={selectAllOnFocus}
              placeholder="Name"
              aria-label="Name"
              className="field-touch"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
                <input
                  type="text"
                  value={p.callsign}
                  onChange={(e) => updateParticipant(p.id, { callsign: e.target.value.toUpperCase() })}
                  onFocus={selectAllOnFocus}
                  aria-label={`Callsign for pending station ${p.checkInNumber}`}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="field-touch log-data-face min-w-0 flex-1 font-semibold uppercase text-sky-200"
                />
                <button
                  type="button"
                  onClick={() => updateParticipant(p.id, { hasTraffic: !p.hasTraffic })}
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

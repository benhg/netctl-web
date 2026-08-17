import { useState, useRef, useEffect } from 'react';
import { useNetStore } from '../stores/netStore';

export function CheckInForm() {
  const { addParticipant, lookupCallsign, updateParticipant, session } = useNetStore();
  const [callsign, setCallsign] = useState('');
  const [tacticalCall, setTacticalCall] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [hasTraffic, setHasTraffic] = useState(false);
  const [initialTraffic, setInitialTraffic] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const callsignRef = useRef<HTMLInputElement>(null);
  const lookupTimeoutMs = 200;

  // Focusing a field selects what is there, so a wrong value is typed over
  // rather than deleted first.
  const selectAllOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const formatLookupLocation = (city: string, state: string) => {
    return [city, state].filter(Boolean).join(', ').trim();
  };

  const handleCallsignBlur = async () => {
    if (callsign.length >= 3 && !name && !location) {
      setIsLookingUp(true);
      const result = await lookupCallsign(callsign);
      if (result) {
        setName(result.name);
        setLocation(`${result.city}, ${result.state}`);
      }
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign.trim()) return;

    const normalizedCallsign = callsign.toUpperCase().trim();
    const trimmedName = name.trim();
    const trimmedLocation = location.trim();
    const shouldLookup = normalizedCallsign.length >= 3 && !trimmedName && !trimmedLocation;
    const lookupPromise = shouldLookup ? lookupCallsign(normalizedCallsign) : null;

    let lookupResult = null;
    if (lookupPromise) {
      lookupResult = await Promise.race([
        lookupPromise,
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), lookupTimeoutMs);
        }),
      ]);
    }

    const resolvedLocation = lookupResult
      ? formatLookupLocation(lookupResult.city, lookupResult.state)
      : '';

    const participantId = addParticipant({
      callsign: normalizedCallsign,
      tacticalCall: tacticalCall.trim(),
      name: trimmedName || lookupResult?.name || '',
      location: trimmedLocation || resolvedLocation,
      hasTraffic,
      initialTraffic: initialTraffic.trim(),
    });

    if (lookupPromise) {
      lookupPromise.then((result) => {
        if (!result) return;
        const { participants } = useNetStore.getState();
        const participant = participants.find((p) => p.id === participantId);
        if (!participant) return;
        const updates: { name?: string; location?: string } = {};
        if (!participant.name && result.name) {
          updates.name = result.name;
        }
        if (!participant.location) {
          const nextLocation = formatLookupLocation(result.city, result.state);
          if (nextLocation) {
            updates.location = nextLocation;
          }
        }
        if (Object.keys(updates).length > 0) {
          updateParticipant(participantId, updates);
        }
      });
    }

    setCallsign('');
    setTacticalCall('');
    setName('');
    setLocation('');
    setHasTraffic(false);
    setInitialTraffic('');
    setNoteOpen(false);
    callsignRef.current?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        callsignRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!session || session.status !== 'active') {
    return null;
  }

  // The note field costs a permanent block of height for something most
  // check-ins never use, so it is revealed on demand or when traffic is flagged.
  const showNote = hasTraffic || noteOpen || initialTraffic.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="panel shrink-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Check In Station</h2>
        <span className="text-[11px] text-slate-500">F2</span>
      </div>
      {/* Placeholders carry the field names, so no label rows are needed. */}
      <div className="flex flex-wrap gap-1.5">
        <input
          ref={callsignRef}
          type="text"
          value={callsign}
          onChange={(e) => setCallsign(e.target.value.toUpperCase())}
          onFocus={selectAllOnFocus}
          onBlur={handleCallsignBlur}
          placeholder="Callsign *"
          aria-label="Callsign"
          className="field log-data-face w-[8.5rem] font-semibold uppercase"
          disabled={isLookingUp}
        />
        <input
          type="text"
          value={tacticalCall}
          onChange={(e) => setTacticalCall(e.target.value)}
          onFocus={selectAllOnFocus}
          placeholder="Tactical"
          aria-label="Tactical call"
          className="field w-[7rem]"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={selectAllOnFocus}
          placeholder="Name"
          aria-label="Name"
          className="field min-w-0 flex-1 basis-32"
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onFocus={selectAllOnFocus}
          placeholder="Location/QTH"
          aria-label="Location or QTH"
          className="field min-w-0 flex-1 basis-32"
        />
      </div>
      {showNote && (
        <textarea
          value={initialTraffic}
          onChange={(e) => setInitialTraffic(e.target.value)}
          placeholder={
            hasTraffic ? 'Note about the pending traffic...' : 'Remarks for the check-in log...'
          }
          rows={1}
          aria-label="Initial traffic or remarks"
          className="field mt-1.5 resize-none"
        />
      )}
      <div className="mt-1.5 flex items-center gap-3">
        <button
          type="submit"
          disabled={!callsign.trim() || isLookingUp}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isLookingUp ? 'Looking up...' : 'Check In'}
        </button>
        <label className="flex items-center gap-1.5 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={hasTraffic}
            onChange={(e) => setHasTraffic(e.target.checked)}
            className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-amber-500 focus:ring-amber-500"
          />
          Traffic
        </label>
        {!showNote && (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            + Note
          </button>
        )}
      </div>
    </form>
  );
}

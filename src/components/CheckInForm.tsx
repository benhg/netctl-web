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

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      <h2 className="text-lg font-semibold text-white mb-3">Check In Station</h2>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Callsign *</label>
          <input
            ref={callsignRef}
            type="text"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value.toUpperCase())}
            onFocus={selectAllOnFocus}
            onBlur={handleCallsignBlur}
            placeholder="W1ABC"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
            disabled={isLookingUp}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Tactical Call</label>
          <input
            type="text"
            value={tacticalCall}
            onChange={(e) => setTacticalCall(e.target.value)}
            onFocus={selectAllOnFocus}
            placeholder="Command, Base, Mobile 1..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={selectAllOnFocus}
            placeholder="John Smith"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Location/QTH</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onFocus={selectAllOnFocus}
            placeholder="Boston, MA"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-slate-400">Initial Traffic</label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={hasTraffic}
                onChange={(e) => setHasTraffic(e.target.checked)}
                className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-amber-500 focus:ring-amber-500"
              />
              Traffic waiting
            </label>
          </div>
          <textarea
            value={initialTraffic}
            onChange={(e) => setInitialTraffic(e.target.value)}
            placeholder={
              hasTraffic
                ? 'Short note about the pending traffic...'
                : 'Brief traffic or remarks for the check-in log...'
            }
            rows={2}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={!callsign.trim() || isLookingUp}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
        >
          {isLookingUp ? 'Looking up...' : 'Check In'}
        </button>
        <p className="text-xs text-slate-500">Press F2 to focus callsign field</p>
      </div>
    </form>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useNetStore } from '../stores/netStore';

export function CheckInForm() {
  const { addParticipant, lookupCallsign, session } = useNetStore();
  const [callsign, setCallsign] = useState('');
  const [tacticalCall, setTacticalCall] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const callsignRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign.trim()) return;

    addParticipant({
      callsign: callsign.toUpperCase().trim(),
      tacticalCall: tacticalCall.trim(),
      name: name.trim(),
      location: location.trim(),
    });

    setCallsign('');
    setTacticalCall('');
    setName('');
    setLocation('');
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
            placeholder="Boston, MA"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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

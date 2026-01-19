import { useState } from 'react';
import { useNetStore } from '../stores/netStore';

export function NewSessionForm() {
  const { createSession, session } = useNetStore();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('');
  const [netControlOp, setNetControlOp] = useState('');
  const [netControlName, setNetControlName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !netControlOp.trim()) return;

    createSession({
      name: name.trim(),
      frequency: frequency.trim(),
      netControlOp: netControlOp.toUpperCase().trim(),
      netControlName: netControlName.trim(),
    });
  };

  if (session) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Start New Net Session</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Net Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunday Morning Net"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Frequency</label>
            <input
              type="text"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="146.520 MHz"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Net Control Callsign *</label>
            <input
              type="text"
              value={netControlOp}
              onChange={(e) => setNetControlOp(e.target.value.toUpperCase())}
              placeholder="W1ABC"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Net Control Name</label>
            <input
              type="text"
              value={netControlName}
              onChange={(e) => setNetControlName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || !netControlOp.trim()}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
          >
            Start Net
          </button>
        </div>
      </form>
    </div>
  );
}

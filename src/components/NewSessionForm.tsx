import { useRef, useState, type ChangeEvent } from 'react';
import { useNetStore } from '../stores/netStore';

export function NewSessionForm() {
  const { createSession, importFromCsv, session, error } = useNetStore();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('');
  const [netControlOp, setNetControlOp] = useState('');
  const [netControlName, setNetControlName] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [requireAck, setRequireAck] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !netControlOp.trim()) return;

    createSession({
      name: name.trim(),
      frequency: frequency.trim(),
      netControlOp: netControlOp.toUpperCase().trim(),
      netControlName: netControlName.trim(),
      preparedBy: preparedBy.trim(),
      requireAck,
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const csvText = await file.text();
    importFromCsv(csvText);
    event.target.value = '';
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

          <div>
            <label className="block text-sm text-slate-300 mb-1">Prepared By</label>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder="Name, Position"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Set the check-in style up front; still switchable mid-net from the
              Checked In Stations header. */}
          <label className="flex cursor-pointer items-start gap-2 rounded border border-slate-700 bg-slate-900/60 p-2.5">
            <input
              type="checkbox"
              checked={requireAck}
              onChange={(e) => setRequireAck(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-500 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
            <span>
              <span className="block text-sm text-slate-200">Require ACK</span>
              <span className="block text-xs text-slate-400">
                Stations wait for net control to acknowledge them before joining the roster.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={!name.trim() || !netControlOp.trim()}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
          >
            Start Net
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded transition-colors"
          >
            Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          {error && (
            <div className="rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

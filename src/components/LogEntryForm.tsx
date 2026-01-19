import { useState, useRef, useEffect } from 'react';
import { useNetStore } from '../stores/netStore';
import type { Participant } from '../types';

interface LogEntryFormProps {
  selectedParticipant: Participant | null;
  onClear: () => void;
}

export function LogEntryForm({ selectedParticipant, onClear }: LogEntryFormProps) {
  const { addLogEntry, participants, session } = useNetStore();
  const [fromCallsign, setFromCallsign] = useState('');
  const [toCallsign, setToCallsign] = useState('NC');
  const [message, setMessage] = useState('');
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (selectedParticipant) {
      // Use tactical call if available, otherwise use callsign
      setFromCallsign(selectedParticipant.tacticalCall || selectedParticipant.callsign);
      setToCallsign('NC');
      messageRef.current?.focus();
    }
  }, [selectedParticipant]);

  const submitEntry = () => {
    if (!fromCallsign.trim()) return;

    addLogEntry({
      fromCallsign: fromCallsign.trim(),
      toCallsign: toCallsign.trim() || 'NC',
      message: message.trim(),
    });

    setFromCallsign('');
    setToCallsign('NC');
    setMessage('');
    onClear();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitEntry();
  };

  const handleMessageKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitEntry();
    }
  };

  if (!session || session.status !== 'active') {
    return null;
  }

  // Build datalist options with both callsigns and tactical calls
  const callsignOptions: { value: string; label: string }[] = [];
  const optionMap = new Map<string, string>();

  optionMap.set('NC', 'NC (Net Control)');
  optionMap.set('ALL', 'ALL (All Stations)');

  for (const p of participants) {
    optionMap.set(p.callsign, p.name ? `${p.callsign} - ${p.name}` : p.callsign);
    if (p.tacticalCall) {
      const label = `${p.tacticalCall} (${p.callsign})${p.name ? ` - ${p.name}` : ''}`;
      optionMap.set(p.tacticalCall, label);
    }
  }

  for (const [value, label] of optionMap.entries()) {
    callsignOptions.push({ value, label });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      <h2 className="text-lg font-semibold text-white mb-3">Add Log Entry</h2>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">From</label>
          <input
            type="text"
            value={fromCallsign}
            onChange={(e) => setFromCallsign(e.target.value)}
            placeholder="Callsign or Tactical"
            list="callsign-list"
            autoComplete="off"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">To</label>
          <input
            type="text"
            value={toCallsign}
            onChange={(e) => setToCallsign(e.target.value)}
            placeholder="NC"
            list="callsign-list"
            autoComplete="off"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-xs text-slate-400 mb-1">Message/Remarks</label>
        <textarea
          ref={messageRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleMessageKeyDown}
          placeholder="Traffic, announcements, or remarks..."
          rows={2}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!fromCallsign.trim()}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
        >
          Add Entry
        </button>
        {selectedParticipant && (
          <button
            type="button"
            onClick={onClear}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>
      <datalist id="callsign-list">
        {callsignOptions.map((opt) => (
          <option key={opt.value} value={opt.value} label={opt.label} />
        ))}
      </datalist>
    </form>
  );
}

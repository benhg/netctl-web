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

  const selectAllOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

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
    <form onSubmit={handleSubmit} className="panel shrink-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Add Log Entry</h2>
        <span className="text-[11px] text-slate-500">Enter to add · Shift+Enter for a new line</span>
      </div>
      {/* From / To / message on one line; the message takes the slack. */}
      <div className="flex flex-wrap items-start gap-1.5">
        <input
          type="text"
          value={fromCallsign}
          onChange={(e) => setFromCallsign(e.target.value)}
          onFocus={selectAllOnFocus}
          placeholder="From"
          aria-label="From callsign"
          list="callsign-list"
          autoComplete="off"
          className="field log-data-face w-[8.5rem] font-semibold"
        />
        <input
          type="text"
          value={toCallsign}
          onChange={(e) => setToCallsign(e.target.value)}
          onFocus={selectAllOnFocus}
          placeholder="To"
          aria-label="To callsign"
          list="callsign-list"
          autoComplete="off"
          className="field log-data-face w-[8.5rem] font-semibold"
        />
        <textarea
          ref={messageRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleMessageKeyDown}
          placeholder="Traffic, announcements, or remarks..."
          rows={1}
          aria-label="Message or remarks"
          className="field min-w-0 flex-1 basis-64 resize-none"
        />
        <button
          type="submit"
          disabled={!fromCallsign.trim()}
          className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          Add
        </button>
        {selectedParticipant && (
          <button
            type="button"
            onClick={onClear}
            className="rounded bg-slate-600 px-2.5 py-1 text-sm text-white transition-colors hover:bg-slate-500"
          >
            Clear
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

import { useRef, useState } from 'react';
import { useNetStore } from '../stores/netStore';
import type { Participant } from '../types';

/**
 * In-place callsign editing for a station that is still waiting for an ACK —
 * shared by the desktop roster and the mobile check-in screen so both behave the
 * same way.
 *
 * Keystrokes are held here and committed once, on blur. Writing per keystroke
 * would push every half-typed value through `updateParticipant`, which renames
 * the station in every log entry that names it and re-serialises the session; a
 * momentarily empty field would commit a blank callsign and blank the From of
 * its own check-in entry.
 */
export function usePendingCallsign() {
  const updateParticipant = useNetStore((state) => state.updateParticipant);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  /*
   * Escape leaves the field by blurring it, and blur() dispatches the blur event
   * synchronously — before a setState from the same handler has landed. So the
   * commit has to be waved off through a ref; clearing the draft first would
   * still leave the blur handler reading the pre-Escape value and saving it.
   */
  const skipCommit = useRef(false);

  const clearDraft = (id: string) => {
    setDrafts((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const valueFor = (participant: Participant) => drafts[participant.id] ?? participant.callsign;

  const setValue = (id: string, value: string) => {
    setDrafts((current) => ({ ...current, [id]: value.toUpperCase() }));
  };

  const commit = (participant: Participant) => {
    const draft = drafts[participant.id];
    clearDraft(participant.id);
    if (skipCommit.current) {
      skipCommit.current = false;
      return;
    }
    if (draft === undefined) return;
    const next = draft.toUpperCase().trim();
    if (!next || next === participant.callsign) return;
    updateParticipant(participant.id, { callsign: next });
  };

  /** Enter commits (via blur), Escape reverts. */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      skipCommit.current = true;
      event.currentTarget.blur();
    }
  };

  return { valueFor, setValue, commit, handleKeyDown };
}

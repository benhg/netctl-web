import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNetStore } from '../stores/netStore';

export type CallsignOption = {
  /** What lands in the field when the option is picked. */
  value: string;
  /** Secondary text: operator name, or what a special token means. */
  detail: string;
  /** Shown ahead of the value when the station has a tactical call. */
  tactical?: string;
};

interface CallsignInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Offer NC and ALL alongside the checked-in stations. */
  includeSpecial?: boolean;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

const SPECIAL_OPTIONS: CallsignOption[] = [
  { value: 'NC', detail: 'Net control' },
  { value: 'ALL', detail: 'All stations' },
];

/**
 * Type-ahead over the stations that have checked in. This replaces a plain
 * <datalist>, which only matches from the start of the value and cannot match on
 * the operator name — so typing a name, or the tail of a callsign, found nothing.
 */
export function CallsignInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className = '',
  inputRef,
  includeSpecial = false,
  onFocus,
}: CallsignInputProps) {
  const { participants } = useNetStore();
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // Per instance: From and To are both comboboxes, so a fixed id would make
  // each one's aria-controls point at the other's list.
  const listboxId = `callsign-autocomplete-${useId()}`;

  const options = useMemo<CallsignOption[]>(() => {
    const fromParticipants = participants.map((p) => ({
      value: p.callsign,
      detail: [p.name, p.location].filter(Boolean).join(' · '),
      tactical: p.tacticalCall || undefined,
    }));
    return includeSpecial ? [...SPECIAL_OPTIONS, ...fromParticipants] : fromParticipants;
  }, [participants, includeSpecial]);

  const query = value.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return options;
    const scored = options
      .map((option) => {
        const haystacks = [option.value, option.tactical ?? '', option.detail].map((s) =>
          s.toLowerCase()
        );
        // Prefix hits rank above mid-string hits, so typing "K6A" puts K6ARK first.
        if (haystacks.some((h) => h.startsWith(query))) return { option, rank: 0 };
        if (haystacks.some((h) => h.includes(query))) return { option, rank: 1 };
        return null;
      })
      .filter((entry): entry is { option: CallsignOption; rank: number } => entry !== null);
    return scored.sort((a, b) => a.rank - b.rank).map((entry) => entry.option);
  }, [options, query]);

  // An exact match needs no menu — the operator has already typed the whole call.
  const isExact = matches.length === 1 && matches[0].value.toLowerCase() === query;
  const showMenu = isOpen && matches.length > 0 && !isExact;

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const pick = (option: CallsignOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!showMenu) {
        setIsOpen(true);
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setHighlight((current) => (current + step + matches.length) % matches.length);
      return;
    }
    if (event.key === 'Enter' && showMenu) {
      // Take the highlighted station; only a closed menu lets Enter submit.
      event.preventDefault();
      pick(matches[highlight]);
      return;
    }
    if (event.key === 'Escape' && showMenu) {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showMenu}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-label={ariaLabel}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={(event) => {
          setIsOpen(true);
          onFocus?.(event);
        }}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showMenu && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-0.5 max-h-56 w-full min-w-56 overflow-y-auto rounded border border-slate-600 bg-slate-900 py-0.5 shadow-lg shadow-black/40"
        >
          {matches.map((option, index) => (
            <li key={`${option.value}-${index}`} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                // Commit before blur can close the menu out from under the click.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(option)}
                onMouseEnter={() => setHighlight(index)}
                className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left transition-colors ${
                  index === highlight ? 'bg-slate-700' : 'hover:bg-slate-800'
                }`}
              >
                {option.tactical && (
                  <span className="shrink-0 rounded bg-yellow-400/15 px-1 text-[10px] font-semibold uppercase text-yellow-200">
                    {option.tactical}
                  </span>
                )}
                <span className="log-data-face shrink-0 text-sm font-semibold text-sky-100">
                  {option.value}
                </span>
                {option.detail && (
                  <span className="min-w-0 truncate text-xs text-slate-400">{option.detail}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

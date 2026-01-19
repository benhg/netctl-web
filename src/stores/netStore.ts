import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { NetSession, Participant, LogEntry, CallsignLookupResult } from '../types';

type SessionData = {
  session: NetSession;
  participants: Participant[];
  logEntries: LogEntry[];
};

type CallsignCacheEntry = {
  result: CallsignLookupResult;
  cachedAt: number;
};

const STORAGE_KEYS = {
  sessions: 'netctl:sessions',
  activeSessionId: 'netctl:activeSessionId',
  callsignCache: 'netctl:callsignCache',
} as const;

const canUseStorage = typeof window !== 'undefined' && !!window.localStorage;

const readJson = <T,>(key: string, fallback: T): T => {
  if (!canUseStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (!canUseStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures (quota, privacy mode).
  }
};

const readSessions = () => readJson<Record<string, SessionData>>(STORAGE_KEYS.sessions, {});

const writeSessions = (sessions: Record<string, SessionData>) => {
  writeJson(STORAGE_KEYS.sessions, sessions);
};

const setActiveSessionId = (id: string | null) => {
  if (!canUseStorage) return;
  try {
    if (id) {
      window.localStorage.setItem(STORAGE_KEYS.activeSessionId, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.activeSessionId);
    }
  } catch {
    // Ignore storage write failures.
  }
};

const loadActiveSessionData = (): SessionData | null => {
  if (!canUseStorage) return null;
  try {
    const activeId = window.localStorage.getItem(STORAGE_KEYS.activeSessionId);
    if (!activeId) return null;
    const sessions = readSessions();
    return sessions[activeId] ?? null;
  } catch {
    return null;
  }
};

const saveSessionData = (data: SessionData) => {
  const sessions = readSessions();
  sessions[data.session.id] = data;
  writeSessions(sessions);
  setActiveSessionId(data.session.id);
};

const removeSessionData = (sessionId: string | null) => {
  if (!sessionId) {
    setActiveSessionId(null);
    return;
  }
  const sessions = readSessions();
  delete sessions[sessionId];
  writeSessions(sessions);
  setActiveSessionId(null);
};

const readCallsignCache = () =>
  readJson<Record<string, CallsignCacheEntry>>(STORAGE_KEYS.callsignCache, {});

const writeCallsignCache = (cache: Record<string, CallsignCacheEntry>) => {
  writeJson(STORAGE_KEYS.callsignCache, cache);
};

interface NetStore {
  session: NetSession | null;
  participants: Participant[];
  logEntries: LogEntry[];
  isLoading: boolean;
  error: string | null;
  startTime: number | null;

  // Session actions
  createSession: (session: Omit<NetSession, 'id' | 'status' | 'dateTime' | 'endTime'>) => void;
  openSession: () => void;
  closeSession: () => void;
  loadSession: (id: string) => Promise<void>;

  // Participant actions
  addParticipant: (participant: Omit<Participant, 'id' | 'checkInTime' | 'checkInNumber'>) => void;
  getDisplayCallsign: (callsign: string) => string;
  removeParticipant: (id: string) => void;

  // Log entry actions
  addLogEntry: (entry: Omit<LogEntry, 'id' | 'entryNumber' | 'time'>) => void;

  // Callsign lookup
  lookupCallsign: (callsign: string) => Promise<CallsignLookupResult | null>;

  // Timer
  getElapsedTime: () => number;

  // Export
  exportToCsv: () => string;

  // Reset
  reset: () => void;
}

const initialSessionData = loadActiveSessionData();

export const useNetStore = create<NetStore>((set, get) => ({
  session: initialSessionData?.session ?? null,
  participants: initialSessionData?.participants ?? [],
  logEntries: initialSessionData?.logEntries ?? [],
  isLoading: false,
  error: null,
  startTime: (() => {
    if (initialSessionData?.session.status === 'active') {
      return new Date(initialSessionData.session.dateTime).getTime();
    }
    return null;
  })(),

  createSession: (sessionData) => {
    const session: NetSession = {
      id: uuidv4(),
      ...sessionData,
      dateTime: new Date().toISOString(),
      endTime: null,
      status: 'pending',
    };
    const netControlParticipant: Participant = {
      id: uuidv4(),
      callsign: sessionData.netControlOp,
      tacticalCall: 'NET',
      name: sessionData.netControlName,
      location: '',
      checkInTime: new Date().toISOString(),
      checkInNumber: 1,
    };
    set({
      session,
      participants: [netControlParticipant],
      logEntries: [],
      startTime: null,
      error: null
    });

    saveSessionData({
      session,
      participants: [netControlParticipant],
      logEntries: [],
    });
  },

  openSession: () => {
    const { session } = get();
      if (session && session.status === 'pending') {
      const activeSession = { ...session, status: 'active' as const, endTime: null };
      set({ session: activeSession, startTime: Date.now() });
      const { participants, logEntries } = get();
      saveSessionData({ session: activeSession, participants, logEntries });
    }
  },

  closeSession: () => {
    const { session } = get();
      if (session) {
      const closedSession = {
        ...session,
        status: 'closed' as const,
        endTime: new Date().toISOString(),
      };
      set({ session: closedSession, startTime: null });
      const { participants, logEntries } = get();
      saveSessionData({ session: closedSession, participants, logEntries });
    }
  },

  loadSession: async (id) => {
    set({ isLoading: true, error: null });
    const sessions = readSessions();
    const data = sessions[id];
    if (!data) {
      set({ error: 'Session not found', isLoading: false });
      return;
    }
    set({
      session: data.session,
      participants: data.participants,
      logEntries: data.logEntries,
      startTime: data.session.status === 'active' ? new Date(data.session.dateTime).getTime() : null,
      isLoading: false,
    });
    setActiveSessionId(data.session.id);
  },

  addParticipant: (participantData) => {
    const { participants, session } = get();
    const participant: Participant = {
      id: uuidv4(),
      ...participantData,
      checkInTime: new Date().toISOString(),
      checkInNumber: participants.length + 1,
    };
    const newParticipants = [...participants, participant];
    set({ participants: newParticipants });

    if (session) {
      saveSessionData({ session, participants: newParticipants, logEntries: get().logEntries });
    }

    if (session?.status === 'active') {
      get().addLogEntry({
        fromCallsign: participant.callsign,
        toCallsign: 'NC',
        message: 'check in',
      });
    }
  },

  removeParticipant: (id) => {
    const { participants, session, logEntries } = get();
    const newParticipants = participants.filter((p) => p.id !== id);
    set({ participants: newParticipants });
    if (session) {
      saveSessionData({ session, participants: newParticipants, logEntries });
    }
  },

  getDisplayCallsign: (callsign) => {
    const { participants } = get();
    const participant = participants.find(p => p.callsign === callsign);
    if (participant?.tacticalCall) {
      return `${participant.tacticalCall} (${callsign})`;
    }
    return callsign;
  },

  addLogEntry: (entryData) => {
    const { logEntries, session } = get();
    const entry: LogEntry = {
      id: uuidv4(),
      ...entryData,
      time: new Date().toISOString(),
      entryNumber: logEntries.length + 1,
    };
    const newEntries = [...logEntries, entry];
    set({ logEntries: newEntries });

    if (session) {
      saveSessionData({ session, participants: get().participants, logEntries: newEntries });
    }
  },

  lookupCallsign: async (callsign) => {
    const normalized = callsign.toUpperCase().trim();
    if (!normalized) return null;

    const cache = readCallsignCache();
    if (cache[normalized]) {
      return cache[normalized].result;
    }

    try {
      const response = await fetch(`https://api.hamdb.org/v1/${normalized}/json/netctl`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const cs = data?.hamdb?.callsign;
      if (!cs) return null;

      const nameParts = [cs.fname, cs.name].filter(Boolean).join(' ');
      const result: CallsignLookupResult = {
        callsign: cs.call || normalized,
        name: nameParts,
        city: cs.addr2 || '',
        state: cs.state || '',
        country: cs.country || 'USA',
        grid: cs.grid || '',
      };

      cache[normalized] = { result, cachedAt: Date.now() };
      writeCallsignCache(cache);
      return result;
    } catch (err) {
      console.error('Callsign lookup failed:', err);
      return null;
    }
  },

  getElapsedTime: () => {
    const { startTime } = get();
    if (!startTime) return 0;
    return Date.now() - startTime;
  },

  exportToCsv: () => {
    const { session, participants, logEntries } = get();
    if (!session) return '';

    const lines: string[] = [];
    lines.push('ICS 309 Communications Log');
    lines.push(`Net Name,${session.name}`);
    lines.push(`Frequency,${session.frequency}`);
    lines.push(`Net Control,${session.netControlOp} - ${session.netControlName}`);
    lines.push(`Date/Time,${session.dateTime}`);
    lines.push('');
    lines.push('Participants');
    lines.push('Check-In #,Callsign,Tactical,Name,Location,Time');
    for (const p of participants) {
      lines.push(`${p.checkInNumber},${p.callsign},${p.tacticalCall || ''},${p.name},${p.location},${p.checkInTime}`);
    }
    lines.push('');
    lines.push('Communications Log');
    lines.push('Entry #,Time,From,To,Message');
    for (const e of logEntries) {
      lines.push(`${e.entryNumber},${e.time},${e.fromCallsign},${e.toCallsign},"${e.message.replace(/"/g, '""')}"`);
    }

    return lines.join('\n');
  },

  reset: () => {
    removeSessionData(get().session?.id ?? null);
    set({
      session: null,
      participants: [],
      logEntries: [],
      isLoading: false,
      error: null,
      startTime: null,
    });
  },
}));

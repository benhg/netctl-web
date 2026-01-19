import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { NetSession, Participant, LogEntry, CallsignLookupResult } from '../types';

type SessionData = {
  session: NetSession;
  participants: Participant[];
  logEntries: LogEntry[];
  lastAcknowledgedEntryId: string | null;
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
  lastAcknowledgedEntryId: string | null;
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
  updateParticipant: (
    id: string,
    updates: Partial<Omit<Participant, 'id' | 'checkInTime' | 'checkInNumber'>>
  ) => void;
  getDisplayCallsign: (callsign: string) => string;
  removeParticipant: (id: string) => void;

  // Log entry actions
  addLogEntry: (entry: Omit<LogEntry, 'id' | 'entryNumber' | 'time'>) => void;
  setLastAcknowledgedEntry: (id: string) => void;

  // Callsign lookup
  lookupCallsign: (callsign: string) => Promise<CallsignLookupResult | null>;

  // Timer
  getElapsedTime: () => number;

  // Export
  exportToCsv: () => string;
  importFromCsv: (csvText: string) => void;

  // Reset
  reset: () => void;
}

const initialSessionData = loadActiveSessionData();

export const useNetStore = create<NetStore>((set, get) => ({
  session: initialSessionData?.session ?? null,
  participants: initialSessionData?.participants ?? [],
  logEntries: initialSessionData?.logEntries ?? [],
  lastAcknowledgedEntryId: initialSessionData?.lastAcknowledgedEntryId ?? null,
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
      lastAcknowledgedEntryId: null,
      startTime: null,
      error: null
    });

    saveSessionData({
      session,
      participants: [netControlParticipant],
      logEntries: [],
      lastAcknowledgedEntryId: null,
    });
  },

  openSession: () => {
    const { session } = get();
    if (session && session.status === 'pending') {
      const activeSession = { ...session, status: 'active' as const, endTime: null };
      set({ session: activeSession, startTime: Date.now() });
      const { participants, logEntries, lastAcknowledgedEntryId } = get();
      saveSessionData({ session: activeSession, participants, logEntries, lastAcknowledgedEntryId });
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
      const { participants, logEntries, lastAcknowledgedEntryId } = get();
      saveSessionData({ session: closedSession, participants, logEntries, lastAcknowledgedEntryId });
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
      lastAcknowledgedEntryId: data.lastAcknowledgedEntryId ?? null,
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
      saveSessionData({
        session,
        participants: newParticipants,
        logEntries: get().logEntries,
        lastAcknowledgedEntryId: get().lastAcknowledgedEntryId,
      });
    }

    if (session?.status === 'active') {
      get().addLogEntry({
        fromCallsign: participant.callsign,
        toCallsign: 'NC',
        message: 'check in',
      });
    }
  },

  updateParticipant: (id, updates) => {
    const { participants, session, logEntries, lastAcknowledgedEntryId } = get();
    const current = participants.find((p) => p.id === id);
    if (!current) return;

    const nextParticipant: Participant = {
      ...current,
      ...updates,
      callsign: (updates.callsign ?? current.callsign).trim(),
      tacticalCall: (updates.tacticalCall ?? current.tacticalCall).trim(),
      name: (updates.name ?? current.name).trim(),
      location: (updates.location ?? current.location).trim(),
    };

    const updatedParticipants = participants.map((p) => (p.id === id ? nextParticipant : p));
    const callsignChanged =
      typeof updates.callsign === 'string' &&
      updates.callsign.trim().toUpperCase() !== current.callsign;
    const tacticalChanged =
      typeof updates.tacticalCall === 'string' &&
      updates.tacticalCall.trim() !== current.tacticalCall;

    const replaceToken = (token: string) => {
      if (callsignChanged && token === current.callsign) {
        return nextParticipant.callsign;
      }
      if (tacticalChanged && token === current.tacticalCall) {
        return nextParticipant.tacticalCall || nextParticipant.callsign;
      }
      return token;
    };

    const updatedLogEntries = logEntries.map((entry) => ({
      ...entry,
      fromCallsign: replaceToken(entry.fromCallsign),
      toCallsign: replaceToken(entry.toCallsign),
    }));

    set({ participants: updatedParticipants, logEntries: updatedLogEntries });

    if (session) {
      saveSessionData({
        session,
        participants: updatedParticipants,
        logEntries: updatedLogEntries,
        lastAcknowledgedEntryId,
      });
    }
  },

  removeParticipant: (id) => {
    const { participants, session, logEntries, lastAcknowledgedEntryId } = get();
    const newParticipants = participants.filter((p) => p.id !== id);
    set({ participants: newParticipants });
    if (session) {
      saveSessionData({ session, participants: newParticipants, logEntries, lastAcknowledgedEntryId });
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
      saveSessionData({
        session,
        participants: get().participants,
        logEntries: newEntries,
        lastAcknowledgedEntryId: get().lastAcknowledgedEntryId,
      });
    }
  },

  setLastAcknowledgedEntry: (id) => {
    const { session, participants, logEntries } = get();
    set({ lastAcknowledgedEntryId: id });
    if (session) {
      saveSessionData({ session, participants, logEntries, lastAcknowledgedEntryId: id });
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

  importFromCsv: (csvText) => {
    const parseCsvLine = (line: string) => {
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (inQuotes) {
          if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else if (char === '"') {
            inQuotes = false;
          } else {
            current += char;
          }
        } else if (char === ',') {
          fields.push(current);
          current = '';
        } else if (char === '"') {
          inQuotes = true;
        } else {
          current += char;
        }
      }
      fields.push(current);
      return fields;
    };

    try {
      const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalized.split('\n');
      const getValueAfterLabel = (label: string) => {
        const line = lines.find((row) => row.startsWith(`${label},`));
        if (!line) return '';
        const [, ...rest] = parseCsvLine(line);
        return rest.join(',').trim();
      };

      const name = getValueAfterLabel('Net Name') || 'Imported Net';
      const frequency = getValueAfterLabel('Frequency');
      const netControlLine = getValueAfterLabel('Net Control');
      const [netControlOpRaw, ...netControlNameParts] = netControlLine.split(' - ');
      const netControlOp = netControlOpRaw?.trim().toUpperCase() || 'NET';
      const netControlName = netControlNameParts.join(' - ').trim();
      const dateTime = getValueAfterLabel('Date/Time') || new Date().toISOString();

      const participants: Participant[] = [];
      const logEntries: LogEntry[] = [];
      let section: 'participants' | 'log' | null = null;

      for (const line of lines) {
        if (!line.trim()) continue;
        if (line === 'Participants') {
          section = 'participants';
          continue;
        }
        if (line === 'Communications Log') {
          section = 'log';
          continue;
        }
        if (line.startsWith('Check-In #') || line.startsWith('Entry #')) {
          continue;
        }
        if (!section) continue;

        const fields = parseCsvLine(line);
        if (section === 'participants') {
          const [checkInNumberRaw, callsignRaw, tacticalCall, nameField, location, checkInTime] =
            fields;
          if (!callsignRaw) continue;
          const checkInNumber = Number.parseInt(checkInNumberRaw, 10);
          participants.push({
            id: uuidv4(),
            callsign: callsignRaw.trim().toUpperCase(),
            tacticalCall: (tacticalCall || '').trim(),
            name: (nameField || '').trim(),
            location: (location || '').trim(),
            checkInTime: (checkInTime || '').trim() || dateTime,
            checkInNumber: Number.isFinite(checkInNumber) ? checkInNumber : participants.length + 1,
          });
        } else if (section === 'log') {
          const [entryNumberRaw, time, fromCallsign, toCallsign, message] = fields;
          if (!fromCallsign && !toCallsign && !message) continue;
          const entryNumber = Number.parseInt(entryNumberRaw, 10);
          logEntries.push({
            id: uuidv4(),
            entryNumber: Number.isFinite(entryNumber) ? entryNumber : logEntries.length + 1,
            time: (time || '').trim() || dateTime,
            fromCallsign: (fromCallsign || '').trim(),
            toCallsign: (toCallsign || '').trim(),
            message: (message || '').trim(),
          });
        }
      }

      const netControlExists = participants.some(
        (participant) => participant.callsign === netControlOp
      );
      if (!netControlExists) {
        const nextCheckIn =
          participants.reduce((max, participant) => Math.max(max, participant.checkInNumber), 0) + 1;
        participants.unshift({
          id: uuidv4(),
          callsign: netControlOp,
          tacticalCall: 'NET',
          name: netControlName,
          location: '',
          checkInTime: dateTime,
          checkInNumber: nextCheckIn,
        });
      }

      const session: NetSession = {
        id: uuidv4(),
        name,
        frequency,
        netControlOp,
        netControlName,
        dateTime,
        endTime: null,
        status: 'active',
      };

      const startTimeValue = new Date(dateTime).getTime();
      set({
        session,
        participants,
        logEntries,
        lastAcknowledgedEntryId: null,
        startTime: Number.isNaN(startTimeValue) ? null : startTimeValue,
        isLoading: false,
        error: null,
      });

      saveSessionData({
        session,
        participants,
        logEntries,
        lastAcknowledgedEntryId: null,
      });
    } catch (err) {
      set({ error: `Failed to import CSV: ${err}` });
    }
  },

  reset: () => {
    removeSessionData(get().session?.id ?? null);
    set({
      session: null,
      participants: [],
      logEntries: [],
      lastAcknowledgedEntryId: null,
      isLoading: false,
      error: null,
      startTime: null,
    });
  },
}));

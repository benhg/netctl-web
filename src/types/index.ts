export interface NetSession {
  id: string;
  name: string;
  frequency: string;
  netControlOp: string;
  netControlName: string;
  preparedBy: string;
  dateTime: string;
  endTime: string | null;
  status: 'pending' | 'active' | 'closed';
}

export interface Participant {
  id: string;
  callsign: string;
  tacticalCall: string;
  name: string;
  location: string;
  checkInTime: string;
  checkInNumber: number;
}

export interface LogEntry {
  id: string;
  entryNumber: number;
  time: string;
  fromCallsign: string;
  toCallsign: string;
  message: string;
}

export interface CallsignLookupResult {
  callsign: string;
  name: string;
  city: string;
  state: string;
  country: string;
  grid: string;
}

export interface NetState {
  session: NetSession | null;
  participants: Participant[];
  logEntries: LogEntry[];
  isLoading: boolean;
  error: string | null;
}

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
  /** Net control must acknowledge each station that calls in. */
  requireAck?: boolean;
}

export interface Participant {
  id: string;
  callsign: string;
  tacticalCall: string;
  name: string;
  location: string;
  checkInTime: string;
  checkInNumber: number;
  hasTraffic?: boolean;
  trafficNote?: string;
  /**
   * When traffic was flagged, so the queue is called in the order stations
   * raised it rather than the order they checked in.
   */
  trafficSince?: string;
  /** False while the station is waiting for a net control acknowledgement. */
  acked?: boolean;
  /*
   * Provenance of the two fields a callsign lookup can fill. True means the
   * registry put the value there and correcting the callsign may replace it;
   * false means the operator owns it and nothing rewrites it. Anything stored
   * before these existed normalizes to false — a value we cannot prove came
   * from a lookup is the operator's.
   */
  nameFromLookup?: boolean;
  locationFromLookup?: boolean;
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

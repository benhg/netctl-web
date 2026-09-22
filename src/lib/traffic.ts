import type { Participant } from '../types';

/**
 * Stations with traffic waiting, in the order they raised it — first flagged is
 * called first. Rows saved before trafficSince existed fall back to check-in
 * order, which keeps an older session's queue stable instead of arbitrary.
 */
export function trafficQueueOf(participants: Participant[]): Participant[] {
  return participants
    .filter((participant) => participant.hasTraffic)
    .sort((a, b) => {
      const aTime = a.trafficSince ? Date.parse(a.trafficSince) : NaN;
      const bTime = b.trafficSince ? Date.parse(b.trafficSince) : NaN;
      const aValid = Number.isFinite(aTime);
      const bValid = Number.isFinite(bTime);
      if (aValid && bValid && aTime !== bTime) return aTime - bTime;
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      return a.checkInNumber - b.checkInNumber;
    });
}

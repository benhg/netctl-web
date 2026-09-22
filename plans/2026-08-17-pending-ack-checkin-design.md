# Pending ACK check-in — design

Date: 2026-08-17

## Problem

Some nets run a check-in process where net control must *acknowledge* each
station that calls in. The operator needs to capture callsigns quickly as they
are heard, correct the ones they mis-heard, note who has traffic, and then
acknowledge them — often several at once.

Today a check-in is immediate and final: `addParticipant` inserts the station
and writes its `check in` log entry, and the station list renders oldest-first,
so the newest arrivals sink to the bottom of the panel.

## Approach

No new panel. Acknowledgement is a state on the existing participant, surfaced
inline in the Checked In Stations list, which is reordered newest-first.

A station is created as a participant the moment it is captured, with its
`check in` log entry written then, so the ICS 309 log carries the real time the
station called in. ACK only flips the station's state; it writes no log entry of
its own.

## Data model

Two optional fields, both back-compatible with sessions already in
localStorage:

- `Participant.acked?: boolean` — `normalizeParticipant` defaults stored rows to
  `true`, so reloading a session created before this change does not show every
  station as pending.
- `NetSession.requireAck?: boolean` — defaults `false`.

`requireAck` is the mode switch, because only some nets work this way. With it
off, behavior is unchanged from today.

## Store actions (`src/stores/netStore.ts`)

- `addParticipant` stamps `acked: !session.requireAck`, so with ACK mode on
  every new check-in arrives pending.
- `ackParticipant(id)` — acknowledges one station.
- `ackAllPending()` — acknowledges every pending station in a single state
  update and a single localStorage write, so "ACK all" over 20 stations is not
  20 re-renders and 20 writes.
- `setRequireAck(value)` — persists the mode on the session.

Editing a pending callsign reuses the existing `updateParticipant`, which
already rewrites the From/To tokens of log entries that referenced the old
callsign. Correcting a mis-heard call therefore fixes the log too, which is the
main reason the pending callsign must be editable.

No ACK log entries. The `check in` entry already exists from capture time, and
an "NC ack" line per station would bloat the ICS 309 on a 30-station net. This
can be added later if it turns out to be wanted.

## UI (`src/components/ParticipantList.tsx`)

- **Newest first.** The list renders the participant array reversed. This puts
  net control (participant #1) at the bottom.
- **Header** gains the ACK-mode toggle and an `ACK all (N)` button, shown only
  while at least one station is pending.
- **Pending rows are one compact line**: editable callsign input, traffic
  toggle, `ACK` button. Name, QTH and Last TX are omitted — the HamDB lookup may
  still be resolving, and those fields are not what the operator reads while
  acknowledging.
- **Acknowledged rows** keep the current rendering.
- Pending rows use a sky/blue accent rather than amber, because amber already
  means "has traffic" and a pending station with traffic must read as both.

## Select-all on focus

Every check-in field (callsign, tactical, name, location) and the inline pending
callsign input select their contents on focus, so retyping over a wrong value
needs no deleting. This also makes the F2 shortcut behave correctly when the
field still holds text.

## Edge cases

- Pending state persists across reload for free — it is a participant field, and
  participants are already written to localStorage.
- Closing the net with stations still pending leaves them pending. Nothing is
  lost; their check-in entries are already in the log.
- `checkInNumber` is currently `participants.length + 1`, so removing a station
  makes the next check-in reuse a number. ACK-mode nets will hit this constantly,
  since deleting a bad capture is part of the flow. Changed to `max + 1`.

## Out of scope

Separately confirmed bugs, left for their own change: HamDB `NOT_FOUND`
responses poisoning the form and the callsign cache; the first click on "Check
In" being swallowed by the blur lookup; unquoted commas breaking CSV export;
duplicate-callsign detection.

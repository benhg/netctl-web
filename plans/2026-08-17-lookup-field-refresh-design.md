# Refreshing looked-up fields when a callsign is corrected — design

Date: 2026-08-17

## Problem

Net control hears a callsign, types it, and the registry lookup fills the name
and QTH. When the callsign turns out to be wrong — mis-heard, or corrected by
the station itself — fixing it leaves the previous operator's name and QTH in
place. The station is then logged, and exported to the ICS 309, under someone
else's name.

Two paths show it:

- **Before check-in.** The blur lookup fills the draft's name and QTH. Correcting
  the callsign does not re-run the lookup, because the lookup only runs when both
  fields are empty. The stale values are carried into `addParticipant`.
- **After check-in.** Correcting a pending station's callsign in place calls
  `updateParticipant` with the new callsign and nothing else, so name and QTH are
  left exactly as the previous lookup wrote them.

## Approach

Track, per field, whether the value came from a lookup or from the operator.
A callsign change refreshes only the fields that came from a lookup.

The alternatives were weaker. Comparing each field against a remembered lookup
result avoids the bookkeeping but silently wipes a value the operator typed that
happens to match the registry. Always clearing and refetching needs no data model
change at all, but throws away hand-typed values for stations the registry does
not know — the case that most needs protecting.

## Data model

Both fields are optional and back-compatible with sessions already in
localStorage:

- `Participant.nameFromLookup?: boolean`
- `Participant.locationFromLookup?: boolean`

`normalizeParticipant` defaults stored rows to `false`. A value we cannot prove
came from a lookup is treated as the operator's and is never rewritten, so
reloading or importing an older session can only under-refresh, never clobber.

`CheckInDraft` carries the same pair. The draft is deliberately not persisted, so
neither is its provenance.

## Who sets the flags

Set true by the two lookup paths, per field, and only for a field the lookup
actually filled:

- the blur lookup in `CheckInForm` and `MobileCheckIn`, via `patchCheckInDraft`
- the deferred post-check-in lookup, via a new `updateParticipant` option:
  `updateParticipant(id, updates, { fromLookup: true })`

Set false whenever the operator owns the value:

- a keystroke in the Name or QTH field of either check-in form
- the roster Edit form, for each field whose value the operator changed; fields
  left untouched keep whatever flag they had

## The refresh (`updateParticipant`)

It lives in the store, so all three places a callsign can change inherit it: the
pending-ACK row on desktop, the same row on mobile, and the roster Edit form.

When the callsign actually changes and the write is not itself from a lookup:

1. Blank `name`/`location` where the corresponding flag is true, leaving
   operator-typed values alone. The wrong name disappears immediately rather than
   lingering for the length of a network round trip.
2. Look up the new callsign. On success, write the result into those same fields
   and re-mark them as lookup-filled.

Before applying the result, re-read the participant and bail if it is gone or its
callsign has changed again — the same staleness guard the check-in lookup uses,
so a second correction while the first request is in flight cannot be overwritten
by the stale answer.

## The draft

Correcting the callsign in the check-in form blanks the draft's lookup-filled
name and QTH. That also re-arms the blur lookup, which only runs when both are
empty, so `W6AAA` → tab → correct to `K6ARK` → tab fills the right operator.

## Failure handling

A callsign the registry does not know leaves the fields blank; the operator types
them, and those values are then operator-owned and safe from later refreshes.
Offline behaves identically. Each correction costs one lookup, the same as a
check-in.

## Verification

No test framework in this repo, so this is driven in the browser:

- an auto-filled name and QTH refresh when the callsign is corrected
- a hand-typed name survives a callsign correction
- correcting to a callsign with no registry match blanks the auto-filled fields
  and leaves them blank
- the pre-check-in draft case fills the corrected callsign's operator
- a session imported or stored before this change is never rewritten
